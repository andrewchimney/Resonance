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

with open("parameters.txt", "r") as f:
    parameter_list = f.read()

PRESET_GENERATION_SYSTEM = """You are an expert music synthesis assistant specialized in modifying synthesizer preset files in Vital the synthesizer . Your role is to interpret the user's creative or technical intent and translate it into precise parameter changes.

                              ## Your Capabilities
                              You can read and modify synthesizer preset parameters. When given a preset file, you analyze its current state and apply changes that best reflect what the user is asking for — whether they describe it technically ("increase filter cutoff") or creatively ("make it sound darker" or "add more movement").

                              ## How You Operate
                              1. **Interpret intent**: Understand both technical requests and creative/emotional descriptions.
                              2. **Map to parameters**: Identify which parameters are relevant to the user's goal.
                              3. **Make competent decisions**: Choose sensible values based on synthesis knowledge. If a user says "make it warmer", you know to lower filter cutoff, reduce high EQ, maybe increase oscillator detune slightly.
                              4. **Explain your changes**: After modifying the preset, briefly summarize what you changed and why.

                              ## Parameter Modification Rules
                              - Only modify parameters that are listed in the available parameters schema provided to you.
                              - Do not invent or use parameters outside of the defined list.
                              - Be conservative with changes unless the user asks for something dramatic — prefer surgical edits.
                              - When modifying multiple related parameters (e.g., an envelope), consider how they interact with each other.

                              ## Creative Intent Mapping (examples)
                              - "Darker" → lower filter cutoff, reduce high EQ gain, reduce distortion brightness
                              - "Brighter" → increase filter cutoff, boost high EQ, increase oscillator spectral morph
                              - "More movement" → increase LFO frequency/depth, add modulation to cutoff or pitch
                              - "Punchy" → shorter attack, shorter decay, increase compressor settings
                              - "Pad-like" → longer attack, long release, add reverb, chorus
                              - "Aggressive" → increase distortion drive, raise compressor ratio, add unison voices
                              - "Wider" → increase stereo spread on oscillators, enable chorus, increase unison detune

                              ## Output Format
                              When making changes, output:
                              1. A JSON object containing only the parameters you are changing and their new values.
                              2. A short explanation (2-4 sentences) of what was changed and the reasoning behind it."""

PRESET_GENERATION_SYSTEM = PRESET_GENERATION_SYSTEM + f"""

## Available Parameters
The following is the exhaustive list of parameters you are allowed to read and modify. Do not use any parameter not on this list:

{parameter_list}
"""

PRESET_GENERATION_TEMPLATE = """Based on the user's description, suggest synthesizer preset parameters.

User's description: {description}

{context}

Provide specific Vital synthesizer parameters to achieve this sound.

Here is the format (JSON ONLY):

{
  "changes": {
    "filter_1_cutoff": 85.0,
    "filter_1_resonance": 0.35,

    "lfo_1_frequency": 0.4,
    "lfo_1_fade_time": 0.8,

    "modulation_1_amount": 0.3,
    "modulation_1_bipolar": 1,
    "modulation_1_bypass": 0

    "chorus_on": 1,
    "chorus_dry_wet": 0.3,

    "eq_high_gain": 3.5,
    "eq_high_cutoff": 8000.0,
    "eq_on": 1
  },
  "explanation": "Filter cutoff was raised and a high shelf EQ boost applied to brighten the overall tone. A slow LFO with a fade-in was added to introduce gradual movement, routed via modulation_1. Light chorus was enabled to add shimmer and width."
}

We will only accept outputs in that given format. Do not include any additional text or explanations outside of the JSON object."""


RAG_SYSTEM = """You are a helpful assistant for SynthGPT, a platform for sharing and generating 
synthesizer presets. You have access to a database of presets that can help answer questions.

When provided with a preset as an input, read it thoroughly and use it to inform your response.
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
