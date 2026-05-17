from __future__ import annotations

from app.mips.signals import COMPONENT_IDS, WIRE_IDS


def datapath_state(cycle_events: list[dict]) -> dict:
    components: set[str] = set()
    wires: set[str] = set()

    for event in cycle_events:
        components.update(
            component
            for component in event.get("componentIds", [])
            if component in COMPONENT_IDS
        )
        wires.update(wire for wire in event.get("wireIds", []) if wire in WIRE_IDS)

    return {
        "activeComponents": sorted(components),
        "activeWires": sorted(wires),
    }

