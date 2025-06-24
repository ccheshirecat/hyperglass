"""API Routes."""

# Standard Library
import json
import time
import typing as t
from datetime import UTC, datetime

# Third Party
from litestar import Request, Response, get, post
from litestar.di import Provide
from litestar.background_tasks import BackgroundTask

# Project
from hyperglass.log import log
from hyperglass.state import HyperglassState
from hyperglass.exceptions import HyperglassError
from hyperglass.models.api import Query
from hyperglass.models.data import OutputDataModel
from hyperglass.util.typing import is_type
from hyperglass.execution.main import execute
from hyperglass.models.api.response import QueryResponse
from hyperglass.models.config.params import Params, APIParams
from hyperglass.models.config.devices import Devices, APIDevice

# Local
from .state import get_state, get_params, get_devices
from .tasks import send_webhook
from .fake_output import fake_output

__all__ = (
    "device",
    "devices",
    "queries",
    "info",
    "query",
    "speedtest_download",
    "speedtest_upload",
    "speedtest_file",
    "iperf3_server",
    "network_ping",
    "network_traceroute",
    "bandwidth_stats",
    "als_status",
)


@get("/api/devices/{id:str}", dependencies={"devices": Provide(get_devices)})
async def device(devices: Devices, id: str) -> APIDevice:
    """Retrieve a device by ID."""
    return devices[id].export_api()


@get("/api/devices", dependencies={"devices": Provide(get_devices)})
async def devices(devices: Devices) -> t.List[APIDevice]:
    """Retrieve all devices."""
    return devices.export_api()


@get("/api/queries", dependencies={"devices": Provide(get_devices)})
async def queries(devices: Devices) -> t.List[str]:
    """Retrieve all directive names."""
    return devices.directive_names()


@get("/api/info", dependencies={"params": Provide(get_params)})
async def info(params: Params) -> APIParams:
    """Retrieve looking glass parameters."""
    return params.export_api()


@post("/api/query", dependencies={"_state": Provide(get_state)})
async def query(_state: HyperglassState, request: Request, data: Query) -> QueryResponse:
    """Ingest request data pass it to the backend application to perform the query."""

    timestamp = datetime.now(UTC)

    # Initialize cache
    cache = _state.redis

    # Use hashed `data` string as key for for k/v cache store so
    # each command output value is unique.
    cache_key = f"hyperglass.query.{data.digest()}"

    _log = log.bind(query=data.summary())

    _log.info("Starting query execution")

    cache_response = cache.get_map(cache_key, "output")
    json_output = False
    cached = False
    runtime = 65535

    if cache_response:
        _log.bind(cache_key=cache_key).debug("Cache hit")

        # If a cached response exists, reset the expiration time.
        cache.expire(cache_key, expire_in=_state.params.cache.timeout)

        cached = True
        runtime = 0
        timestamp = cache.get_map(cache_key, "timestamp")

    elif not cache_response:
        _log.bind(cache_key=cache_key).debug("Cache miss")

        timestamp = data.timestamp

        starttime = time.time()

        if _state.params.fake_output:
            # Return fake, static data for development purposes, if enabled.
            output = await fake_output(
                query_type=data.query_type,
                structured=data.device.structured_output or False,
            )
        else:
            # Pass request to execution module
            output = await execute(data)

        endtime = time.time()
        elapsedtime = round(endtime - starttime, 4)
        _log.debug("Runtime: {!s} seconds", elapsedtime)

        if output is None:
            raise HyperglassError(message=_state.params.messages.general, alert="danger")

        json_output = is_type(output, OutputDataModel)

        if json_output:
            # Export structured output as JSON string to guarantee value
            # is serializable, then convert it back to a dict.
            as_json = output.export_json()
            raw_output = json.loads(as_json)
        else:
            raw_output = str(output)

        cache.set_map_item(cache_key, "output", raw_output)
        cache.set_map_item(cache_key, "timestamp", timestamp)
        cache.expire(cache_key, expire_in=_state.params.cache.timeout)

        _log.bind(cache_timeout=_state.params.cache.timeout).debug("Response cached")

        runtime = int(round(elapsedtime, 0))

    # If it does, return the cached entry
    cache_response = cache.get_map(cache_key, "output")

    json_output = is_type(cache_response, t.Dict)
    response_format = "text/plain"

    if json_output:
        response_format = "application/json"
    _log.info("Execution completed")

    response = {
        "output": cache_response,
        "id": cache_key,
        "cached": cached,
        "runtime": runtime,
        "timestamp": timestamp,
        "format": response_format,
        "random": data.random(),
        "level": "success",
        "keywords": [],
    }

    return Response(
        response,
        background=BackgroundTask(
            send_webhook,
            params=_state.params,
            data=data,
            request=request,
            timestamp=timestamp,
        ),
    )


# ALS Feature Integration - Speed Test Endpoints

@get("/api/speedtest/download")
async def speedtest_download(request: Request) -> Response:
    """Handle speed test download endpoint."""
    # Local
    from .speedtest import handle_speedtest_download

    return await handle_speedtest_download(request)


@post("/api/speedtest/upload")
async def speedtest_upload(request: Request) -> Response:
    """Handle speed test upload endpoint."""
    # Local
    from .speedtest import handle_speedtest_upload

    return await handle_speedtest_upload(request)


@get("/api/speedtest/file/{filename:str}")
async def speedtest_file(filename: str, request: Request) -> Response:
    """Handle speed test file download endpoint."""
    # Local
    from .speedtest import handle_speedtest_file

    return await handle_speedtest_file(filename, request)


# ALS Feature Integration - Network Tools

@get("/api/tools/iperf3/server")
async def iperf3_server(request: Request) -> Response:
    """Handle iperf3 server endpoint."""
    # Local
    from .network_tools import handle_iperf3_server

    return await handle_iperf3_server(request)


@get("/api/tools/ping")
async def network_ping(request: Request) -> Response:
    """Handle network ping endpoint."""
    # Local
    from .network_tools import handle_network_ping

    return await handle_network_ping(request)


@get("/api/tools/traceroute")
async def network_traceroute(request: Request) -> Response:
    """Handle network traceroute endpoint."""
    # Local
    from .network_tools import handle_traceroute

    return await handle_traceroute(request)


@get("/api/bandwidth/stats")
async def bandwidth_stats(request: Request) -> Response:
    """Handle bandwidth statistics endpoint."""
    # Local
    from .bandwidth import handle_bandwidth_stats

    return await handle_bandwidth_stats(request)


@get("/api/als/status")
async def als_status(request: Request) -> Response:
    """Get ALS features status."""
    # Local
    from .als_startup import get_als_status

    status = get_als_status()
    return Response(content=status, media_type="application/json")
