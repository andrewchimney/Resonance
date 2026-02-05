from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
from supabase import create_client
import laion_clap
import os

clap = laion_clap.CLAP_Module(enable_fusion=False)
clap.load_ckpt()


SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter()

class RetrieveRequest(BaseModel):
    query: str
    k: int = 10

@router.post("/api/retrieve")
def retrieve(req: RetrieveRequest):
    
    uuid = "example-uuid-12345"
    
    emb = clap.get_text_embedding([req.query], use_tensor=False)
    emb = np.asarray(emb, dtype=np.float32)[0]


    # cosine normalize (recommended since you indexed with vector_cosine_ops)
    emb = emb / (np.linalg.norm(emb) + 1e-9)


    test = supabase.table("presets").select("id").limit(5).execute()
    print("VISIBLE PRESETS:", len(test.data or []))
    # 2) similarity search via RPC
    print("req.k: ", req.k)
    res = supabase.rpc(
        "match_presets",
        {"query_embedding": emb.tolist(), "match_count": req.k},
    ).execute()
    
    return {
        "query_received": req.query,
        "k": req.k,
        "results": res.data
    }