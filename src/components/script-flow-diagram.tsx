'use client';

import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, type Node, type Edge } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Workflow } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';


import 'reactflow/dist/style.css';


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
    if (!scriptContent || scriptContent.trim() === '') return { nodes: [], edges: [] };
    
    // Split by step delimiter, but keep the delimiter with the following content.
    const stepsRaw = scriptContent.split(/(?=---STEP:)/g);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const xPos = 150;
    let yPos = 0;

    // Start Node
    nodes.push({
        id: 'start',
        type: 'input',
        data: { label: 'Start Execution' },
        position: { x: xPos, y: yPos },
    });

    let previousNodeId = 'start';
    yPos += 100;
    
    stepsRaw.filter(s => s.trim()).forEach((step, index) => {
        const lines = step.trim().split('\n');
        const titleLine = lines.shift() || '';
        const titleMatch = titleLine.match(/---STEP:(.+)/);
        const title = titleMatch ? titleMatch[1].trim() : `Step ${index + 1}`;
        const commands = lines.join('\n').trim();

        const nodeId = `step-${index}`;
        const nodeHeight = (commands.split('\n').length * 15) + 100;

        nodes.push({
            id: nodeId,
            type: 'custom',
            position: { x: 0, y: yPos },
            data: { label: title, commands: commands || "No commands in this step." },
        });

        yPos += Math.min(nodeHeight, 250) + 50; // Use estimated height, capped

        edges.push({
            id: `e-${previousNodeId}-${nodeId}`,
            source: previousNodeId,
            target: nodeId,
            animated: true,
            style: { stroke: 'hsl(var(--primary))' }
        });

        previousNodeId = nodeId;
    });

    // End Node
    yPos += 25;
    nodes.push({
        id: 'end',
        type: 'output',
        data: { label: 'End Execution' },
        position: { x: xPos, y: yPos },
    });

    edges.push({
        id: `e-${previousNodeId}-end`,
        source: previousNodeId,
        target: 'end',
        style: { stroke: 'hsl(var(--primary))' }
    });

    return { nodes, edges };
};

export function ScriptFlowDiagram({ scriptContent }: { scriptContent: string }) {
    const { nodes, edges } = useMemo(() => parseScriptToFlow(scriptContent), [scriptContent]);

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
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                className="bg-background"
                proOptions={{hideAttribution: true}}
            >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}
