'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, MarkerType } from '@xyflow/react';
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
    const edgeType = 'smoothstep';
    const markerEnd = { type: MarkerType.ArrowClosed };

    // 1. Add Start Node
    nodes.push({ id: 'start', type: 'input', data: { label: 'Start Execution' }, position: { x: xPos + (nodeWidth / 4), y: yPos } });
    let previousNodeId = 'start';
    yPos += 100;

    // 2. Split script into chunks by the step delimiter
    const stepDelimiterRegex = /(?=echo "---STEP:[^"]+")/g;
    const scriptWithoutShebang = scriptContent.replace(/^#![^\n]*\n/, '').trim();
    const chunks = scriptWithoutShebang.split(stepDelimiterRegex).filter(s => s.trim());

    // 3. Process chunks into nodes and edges
    if (chunks.length === 0 && scriptWithoutShebang.length > 0) {
        // Case: Script has content but no ---STEP delimiters
        const commands = scriptWithoutShebang.trim();
        const nodeId = 'step-0';
        const nodeHeight = Math.min((commands.split('\n').length * 15) + 100, 250);
        
        nodes.push({
            id: nodeId, type: 'custom', position: { x: xPos, y: yPos },
            data: { label: 'Script Commands', commands: commands },
        });
        yPos += nodeHeight + 50;
        edges.push({ id: `e-start-${nodeId}`, source: 'start', target: nodeId, type: edgeType, markerEnd });
        previousNodeId = nodeId;

    } else {
        // Case: Script has steps
        chunks.forEach((chunk, index) => {
            let title: string;
            let commands: string;
            
            const titleMatch = chunk.match(/echo "---STEP:([^"]+)"/);

            if (titleMatch) {
                title = titleMatch[1].trim();
                const lines = chunk.split('\n').slice(1);
                commands = lines.join('\n').trim();
            } else {
                title = 'Initial Commands';
                commands = chunk.trim();
            }
            
            const nodeId = `step-${index}`;
            const nodeHeight = Math.min((commands.split('\n').length * 15) + 100, 250);

            nodes.push({
                id: nodeId,
                type: 'custom',
                position: { x: xPos, y: yPos },
                data: { label: title, commands: commands || "No commands in this step." },
            });
            
            yPos += nodeHeight + 50;
            edges.push({ id: `e-${previousNodeId}-${nodeId}`, source: previousNodeId, target: nodeId, type: edgeType, markerEnd });
            previousNodeId = nodeId;
        });
    }

    // 4. Add End Node if there were any steps
    if (nodes.length > 1) {
        yPos += 25;
        nodes.push({ id: 'end', type: 'output', data: { label: 'End Execution' }, position: { x: xPos + (nodeWidth / 4), y: yPos } });
        edges.push({ id: `e-${previousNodeId}-end`, source: previousNodeId, target: 'end', type: edgeType, markerEnd });
    }

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
            >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}
