'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../services/api';
import { GraphData, GraphNode, GraphLink, Structure } from '../types';
import { useAuth } from './AuthContext';

interface GraphContextType {
  // Data
  graphData: GraphData;
  structure: Structure | null;
  loading: boolean;
  error: string | null;

  // Selection state
  selectedNodeId: string | null;
  selectedNode: GraphNode | null;
  
  // Actions
  refreshGraph: () => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  updateLocalNode: (nodeId: string, data: Partial<GraphNode>) => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function GraphProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  // Fonction pour fusionner les positions existantes lors d'un refresh
  // Préserve les données orbitales calculées (fx, fy, orbitBaseAngle, orbitSpeed, orbitRadius)
  const mergePositions = (oldNodes: GraphNode[], newNodes: GraphNode[]): GraphNode[] => {
    const posMap = new Map(oldNodes.map(n => [n.id, {
      fx: (n as any).fx,
      fy: (n as any).fy,
      x: (n as any).x,
      y: (n as any).y,
      orbitBaseAngle: (n as any).orbitBaseAngle,
      orbitSpeed: (n as any).orbitSpeed,
      orbitRadius: (n as any).orbitRadius,
      parentStarId: (n as any).parentStarId,
    }]));
    return newNodes.map(n => {
      const existing = posMap.get(n.id);
      if (existing && existing.fx !== undefined) {
        return { ...n, ...existing } as GraphNode;
      }
      return n;
    });
  };
  const [structure, setStructure] = useState<Structure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Charger le graphe et la structure
  const refreshGraph = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch
      const [graphRes, structureRes] = await Promise.all([
        api.getGraph(user?.id),
        api.getGalaxyStructure(token)
      ]);

      // Fusionner avec les positions existantes pour préserver l'animation orbitale
      setGraphData(prev => ({
        nodes: prev.nodes.length > 0 ? mergePositions(prev.nodes, graphRes.nodes) : graphRes.nodes,
        links: graphRes.links
      }));
      
      // La structure renvoyée par l'API est déjà au bon format (Object) ou doit être adaptée
      // L'API actuelle renvoie un objet directement utilisable comme Structure
      setStructure(structureRes as unknown as Structure); 

    } catch (err: any) {
      console.error('Error loading graph data:', err);
      setError(err.message || 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  // Initial load
  useEffect(() => {
    if (token) {
      refreshGraph();
    }
  }, [refreshGraph, token]);

  const selectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  const updateLocalNode = (nodeId: string, data: Partial<GraphNode>) => {
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...data } : n)
    }));
  };

  // Derived state
  const selectedNode = selectedNodeId 
    ? graphData.nodes.find(n => n.id === selectedNodeId) || null
    : null;

  return (
    <GraphContext.Provider value={{
      graphData,
      structure,
      loading,
      error,
      selectedNodeId,
      selectedNode,
      refreshGraph,
      selectNode,
      updateLocalNode
    }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
}
