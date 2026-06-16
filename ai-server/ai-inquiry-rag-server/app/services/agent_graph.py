from langgraph.graph import END, StateGraph

from app.services.agent_state import AgentState


def build_agent_graph(agent_service):
    graph = StateGraph(AgentState)
    graph.add_node("retrieve", agent_service.retrieve_context)
    graph.add_node("plan_tools", agent_service.plan_tool_calls)
    graph.add_node("inspect_tools", agent_service.inspect_tool_readiness)
    graph.add_node("generate", agent_service.generate_analysis)
    graph.add_node("recommend_docs", agent_service.recommend_docs)
    graph.add_node("persist", agent_service.persist_analysis)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "plan_tools")
    graph.add_conditional_edges(
        "plan_tools",
        route_tool_loop,
        {
            "inspect_tools": "inspect_tools",
            "generate": "generate",
        },
    )
    graph.add_edge("inspect_tools", "plan_tools")
    graph.add_edge("generate", "recommend_docs")
    graph.add_edge("recommend_docs", "persist")
    graph.add_edge("persist", END)

    return graph.compile()


def route_tool_loop(state: AgentState) -> str:
    if state["tool_loop_complete"]:
        return "generate"

    if state["tool_loop_count"] >= 2:
        return "generate"

    return "inspect_tools"
