"""
LangChain Chains for SynthGPT

Reusable chains for:
- Preset generation from text descriptions
- RAG-enhanced responses
- Chat interactions
"""

from typing import Optional, Any
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from .providers import get_llm


# ==================== PROMPT TEMPLATES ====================

PRESET_GENERATION_SYSTEM = """You are an expert synthesizer programmer specializing in the Vital synthesizer. 
Your task is to help users create synthesizer presets based on their descriptions.

When generating preset modifications, consider:
- Oscillator types and settings (waveforms, unison, detune)
- Filter settings (type, cutoff, resonance, envelope)
- Envelope shapes (ADSR for amp, filter, modulation)
- Effects (reverb, delay, distortion, chorus, phaser)
- Modulation routing (LFOs, envelopes, macros)

Respond with clear, actionable preset parameters that can be applied to Vital.
Be specific about parameter values (0.0 to 1.0 range typically)."""

PRESET_GENERATION_TEMPLATE = """Based on the user's description, suggest synthesizer preset parameters.

User's description: {description}

{context}

Provide specific Vital synthesizer parameters to achieve this sound."""


RAG_SYSTEM = """You are a helpful assistant for SynthGPT, a platform for sharing and generating 
synthesizer presets. You have access to a database of presets that can help answer questions.

When provided with similar presets as context, use them to inform your response.
Be concise and helpful."""

RAG_TEMPLATE = """Question: {question}

Relevant presets from the database:
{context}

Based on the above context, provide a helpful response."""


CHAT_SYSTEM = """You are a helpful assistant for SynthGPT, a platform for synthesizer presets.
You can help users with:
- Understanding synthesizer concepts
- Describing sounds and preset characteristics  
- Suggesting modifications to presets
- General music production advice

Be friendly, knowledgeable, and concise."""


# ==================== CHAIN FACTORIES ====================

def get_generation_chain(
    provider: Optional[str] = None,
    streaming: bool = False,
    **llm_kwargs
):
    """
    Get a chain for generating preset suggestions from text descriptions.
    
    Args:
        provider: LLM provider to use
        streaming: Whether to enable streaming responses
        **llm_kwargs: Additional LLM configuration
    
    Returns:
        A runnable chain that takes {"description": str, "context": str}
    
    Example:
        chain = get_generation_chain()
        result = chain.invoke({
            "description": "warm analog pad with slow attack",
            "context": ""  # or retrieved similar presets
        })
    """
    llm = get_llm(provider=provider, **llm_kwargs)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", PRESET_GENERATION_SYSTEM),
        ("human", PRESET_GENERATION_TEMPLATE),
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    return chain


def get_rag_chain(
    provider: Optional[str] = None,
    **llm_kwargs
):
    """
    Get a RAG chain that combines retrieved context with LLM generation.
    
    Args:
        provider: LLM provider to use
        **llm_kwargs: Additional LLM configuration
    
    Returns:
        A runnable chain that takes {"question": str, "context": str}
    
    Example:
        chain = get_rag_chain()
        result = chain.invoke({
            "question": "What presets are good for bass?",
            "context": "Retrieved preset 1: Heavy Bass\\nRetrieved preset 2: Sub Bass"
        })
    """
    llm = get_llm(provider=provider, **llm_kwargs)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", RAG_SYSTEM),
        ("human", RAG_TEMPLATE),
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    return chain


def get_chat_chain(
    provider: Optional[str] = None,
    **llm_kwargs
):
    """
    Get a conversational chain with message history support.
    
    Args:
        provider: LLM provider to use
        **llm_kwargs: Additional LLM configuration
    
    Returns:
        A runnable chain that takes {"messages": list, "input": str}
    
    Example:
        chain = get_chat_chain()
        result = chain.invoke({
            "messages": [
                {"role": "user", "content": "Hi!"},
                {"role": "assistant", "content": "Hello! How can I help?"}
            ],
            "input": "I want to create a pad sound"
        })
    """
    llm = get_llm(provider=provider, **llm_kwargs)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", CHAT_SYSTEM),
        MessagesPlaceholder(variable_name="messages"),
        ("human", "{input}"),
    ])
    
    def format_messages(data: dict) -> dict:
        """Convert message dicts to LangChain message objects"""
        formatted = []
        for msg in data.get("messages", []):
            if msg["role"] == "user":
                formatted.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                formatted.append(AIMessage(content=msg["content"]))
        return {"messages": formatted, "input": data["input"]}
    
    chain = RunnableLambda(format_messages) | prompt | llm | StrOutputParser()
    
    return chain


def get_preset_modifier_chain(
    provider: Optional[str] = None,
    **llm_kwargs
):
    """
    Get a chain for suggesting modifications to existing presets.
    
    Takes a preset's current parameters and a modification request,
    returns suggested parameter changes.
    """
    llm = get_llm(provider=provider, **llm_kwargs)
    
    system = """You are an expert Vital synthesizer programmer. Given a preset's current 
parameters and a modification request, suggest specific parameter changes.

Output your suggestions as a list of parameter changes in this format:
- parameter_name: old_value -> new_value (reason)

Be precise with parameter names and values."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system),
        ("human", """Current preset parameters:
{preset_params}

Requested modification: {modification}

Suggest specific parameter changes:"""),
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    return chain


# ==================== STREAMING SUPPORT ====================

async def stream_generation(
    description: str,
    context: str = "",
    provider: Optional[str] = None,
    **llm_kwargs
):
    """
    Stream a preset generation response.
    
    Yields chunks of text as they're generated.
    
    Example:
        async for chunk in stream_generation("warm pad"):
            print(chunk, end="", flush=True)
    """
    chain = get_generation_chain(provider=provider, **llm_kwargs)
    
    async for chunk in chain.astream({"description": description, "context": context}):
        yield chunk


async def stream_chat(
    input_text: str,
    messages: list = None,
    provider: Optional[str] = None,
    **llm_kwargs
):
    """
    Stream a chat response.
    
    Yields chunks of text as they're generated.
    """
    chain = get_chat_chain(provider=provider, **llm_kwargs)
    
    async for chunk in chain.astream({"messages": messages or [], "input": input_text}):
        yield chunk
