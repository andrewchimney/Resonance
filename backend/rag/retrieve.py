from typing import List

from fastapi import APIRouter, Request
from pydantic import BaseModel
import numpy as np
from supabase import create_client
import os




SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter()

import json

class RetrieveRequest(BaseModel):
    query: str
    k: int = 10
    


@router.post("/api/retrieve")
def retrieve(req: RetrieveRequest, request: Request):
    
    
    clap = request.app.state.clap
    emb = clap.get_text_embedding([req.query], use_tensor=False)
    emb = np.asarray(emb, dtype=np.float32)[0]
    # cosine normalize 
    emb = emb / (np.linalg.norm(emb) + 1e-9)
    emb_list = emb.flatten().tolist() if hasattr(emb, 'ndim') and emb.ndim > 1 else emb.tolist()
    

    # Try the RPC call
    res = supabase.rpc(
        "match_presets",
        {"query_embedding": emb_list, "match_count": req.k}
    ).execute()

    return {
        "query_received": req.query,
        "k": req.k,
        "results": res.data
    }
    
    
class VectorRecommendRequest(BaseModel):
    vector: List[float]
    k: int = 10
    
@router.post("/api/vectorrecommend")
def retrieve(req: VectorRecommendRequest, request: Request):
    
    
    clap = request.app.state.clap
    emb = np.asarray(req.vector, dtype=np.float32)
    # cosine normalize 
    emb = emb / (np.linalg.norm(emb) + 1e-9)
    emb_list = emb.flatten().tolist() if hasattr(emb, 'ndim') and emb.ndim > 1 else emb.tolist()
    
    

    # Try the RPC call
    res = supabase.rpc(
        "match_presets",
        {"query_embedding": emb_list, "match_count": req.k}
    ).execute()

    return {
        "query_received": req.query,
        "k": req.k,
        "results": res.data
    }
    
class UserRecommendRequest(BaseModel):
    user_uuid: str
    k: int = 10
    
@router.post("/api/userrecommend")
def retrieve(req: UserRecommendRequest, request: Request):
    


    saved = (
        supabase
        .table("saved_presets")
        .select("id, owner_user_id, preset_uuid")
        .eq("owner_user_id", str(req.user_uuid))
        .execute()
    )
    
    preset_ids = [row["preset_uuid"] for row in (saved.data or []) if row.get("preset_uuid")]
    if not preset_ids:
        return {"user_uuid": req.user_uuid, "avg_embedding": None, "message": "no saved preset_uuid rows"}
    
    pres = (
        supabase
        .table("presets")
        .select("id, embedding")
        .in_("id", preset_ids)
        .execute()
    )

    rows = pres.data or []

    vectors = []
    for r in rows:
        e = r.get("embedding")
        if e is None:
            continue

        if isinstance(e, str):
            
            e = e.strip()
            if e.startswith("[") and e.endswith("]"):
                e = np.fromstring(e[1:-1], sep=",", dtype=np.float32)
            else:
                continue
        else:

            e = np.asarray(e, dtype=np.float32)

        vectors.append(e)

    if not vectors:
        return {"user_uuid": req.user_uuid, "avg_embedding": None, "message": "no embeddings found for saved presets"}
    
        
    mat = np.vstack(vectors)         
    avg = mat.mean(axis=0)            
    avg = avg / (np.linalg.norm(avg) + 1e-9)  

    avg_list = avg.tolist()
    
    posts_res = supabase.rpc(
        "match_posts",
        {"query_embedding": avg_list, "match_count": req.k}
    ).execute()


    return {
        "user_uuid": req.user_uuid,
        "k": req.k,
        "results": posts_res.data
    }