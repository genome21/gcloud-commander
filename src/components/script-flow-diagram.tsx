'use client';

import React, { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Workflow } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const CustomNode = ({ data }: { data: { label: string, commands?: string } }) => {
    return (
        <Card className="shadow-md" style={{width: 250}}>
            <CardHeader className="p-3 bg-muted/50 rounded-t-lg">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    {data.label}
                </CardTitle>
            </CardHeader>
            {data.commands && (
                <CardContent className="p-3 max-h-48 overflow-y-auto">
                    <ScrollArea>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground bg-background p-2 rounded-sm">
                            <code>{data.commands}</code>
                        </pre>
                    </ScrollArea>
                </CardContent>
            )}
        </Card>
    );
};

const nodeTypes = {
  custom: CustomNode,
};

const parseScriptToFlow = (scriptContent: string): { nodes: Node[], edges: Edge[] } => {
    if (!scriptContent || scriptContent.trim() === '') {
        return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeWidth = 250;
    const xPos = 50;
    let yPos = 0;
    
    const primaryColor = '#9D4EDD';
    const edgeType = 'smoothstep';
    const markerEnd = { type: MarkerType.ArrowClosed, color: primaryColor };
    const edgeStyle = {
        stroke: primaryColor,
        strokeWidth: 2,
    };

    nodes.push({ id: 'start', type: 'input', data: { label: 'Start Execution' }, position: { x: xPos + (nodeWidth / 4), y: yPos } });
    let previousNodeId = 'start';
    yPos += 100;

    const stepDelimiterRegex = /(?=echo "---STEP:[^"]+")/g;
    const scriptWithoutShebang = scriptContent.replace(/^#![^\n]*\n/, '').trim();
    const chunks = scriptWithoutShebang ? scriptWithoutShebang.split(stepDelimiterRegex).filter(s => s.trim()) : [];

    if (chunks.length === 0 && scriptWithoutShebang.length > 0) {
        const commands = scriptWithoutShebang.trim();
        const nodeId = 'step-0';
        const nodeHeight = Math.min((commands.split('\n').length * 15) + 100, 250);
        
        nodes.push({
            id: nodeId, type: 'custom', position: { x: xPos, y: yPos },
            data: { label: 'Script Commands', commands: commands },
        });
        yPos += nodeHeight + 50;
        edges.push({ id: `e-start-${nodeId}`, source: 'start', target: nodeId, type: edgeType, markerEnd, style: edgeStyle });
        previousNodeId = nodeId;

    } else {
        let firstChunkIsStep = chunks.length > 0 && chunks[0].startsWith('echo "---STEP:');
        let initialCommands = firstChunkIsStep ? '' : (chunks.length > 0 ? chunks.shift() : '');

        if (initialCommands && initialCommands.trim()) {
            const nodeId = 'initial-commands';
            const nodeHeight = Math.min((initialCommands.split('\n').length * 15) + 100, 250);
             nodes.push({
                id: nodeId,
                type: 'custom',
                position: { x: xPos, y: yPos },
                data: { label: 'Initial Commands', commands: initialCommands.trim() },
            });
            yPos += nodeHeight + 50;
            edges.push({ id: `e-start-${nodeId}`, source: 'start', target: nodeId, type: edgeType, markerEnd, style: edgeStyle });
            previousNodeId = nodeId;
        }

        chunks.forEach((chunk, index) => {
            const titleMatch = chunk.match(/echo "---STEP:([^"]+)"/);
            const title = titleMatch ? titleMatch[1].trim() : `Step ${index + 1}`;
            
            const lines = chunk.split('\n').slice(1);
            const commands = lines.join('\n').trim();
            
            const nodeId = `step-${index}`;
            const nodeHeight = Math.min((commands.split('\n').length * 15) + 100, 250);

            nodes.push({
                id: nodeId,
                type: 'custom',
                position: { x: xPos, y: yPos },
                data: { label: title, commands: commands || "No commands in this step." },
            });
            
            yPos += nodeHeight + 50;
            edges.push({ id: `e-${previousNodeId}-${nodeId}`, source: previousNodeId, target: nodeId, type: edgeType, markerEnd, style: edgeStyle });
            previousNodeId = nodeId;
        });
    }

    if (nodes.length > 1) {
        yPos += 25;
        nodes.push({ id: 'end', type: 'output', data: { label: 'End Execution' }, position: { x: xPos + (nodeWidth / 4), y: yPos } });
        edges.push({ id: `e-${previousNodeId}-end`, source: previousNodeId, target: 'end', type: edgeType, markerEnd, style: edgeStyle });
    }

    return { nodes, edges };
};

export function ScriptFlowDiagram({ scriptContent }: { scriptContent: string }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        const { nodes: initialNodes, edges: initialEdges } = parseScriptToFlow(scriptContent);
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [scriptContent, setNodes, setEdges]);


    if(nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50 rounded-md">
                No script content to display.
            </div>
        )
    }

    return (
        <div style={{ width: '100%', height: '100%' }} className="rounded-md border bg-background">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
            >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}
