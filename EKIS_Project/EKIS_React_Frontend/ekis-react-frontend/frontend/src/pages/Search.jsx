import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { semanticSearch } from "../api/search";
import { getApiErrorMessage } from "../api/client";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";

export default function Search() {
  const [params,setParams]=useSearchParams();
  const initial=params.get("q")||"";
  const [query,setQuery]=useState(initial);
  const [results,setResults]=useState([]);
  const [state,setState]=useState({loading:false,error:""});

  const run=async(q=query)=>{
    if(!q.trim()) return;
    setParams({q:q.trim()});
    setState({loading:true,error:""});
    try{
      const {data}=await semanticSearch(q.trim(),10);
      const list=data?.results||data?.items||data?.data||data||[];
      setResults(Array.isArray(list)?list:[]);
      setState({loading:false,error:""});
    }catch(err){setState({loading:false,error:getApiErrorMessage(err, "Search failed.")});}
  };

  useEffect(()=>{ if(initial) run(initial); },[]);

  return <section className="content-view active">
    <div className="overview-header"><h1>Knowledge Search</h1><p>Search relevant chunks across your authenticated knowledge base.</p></div>
    <form className="search-page-form" onSubmit={e=>{e.preventDefault();run()}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search knowledge base..."/><button className="btn-primary">Search</button></form>
    {state.loading?<LoadingState label="Searching knowledge base..." />:state.error?<ErrorState message={state.error}/>:results.length===0?<EmptyState title="No results" text="Enter a query to search the semantic index."/>:<div className="search-results">{results.map((r,i)=><div className="search-result" key={r.document_id??r.chunk_id??i}><div><h3>{r.filename||r.document_name||"Document"}</h3><p>{r.snippet||r.content||r.text||"No snippet returned."}</p></div><div className="result-score">Relevance<br/><strong>{typeof r.score==="number"?r.score.toFixed(2):"—"}</strong></div></div>)}</div>}
  </section>;
}