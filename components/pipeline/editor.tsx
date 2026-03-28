'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  PanOnScrollMode,
  Position,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft,
  Bot,
  Calendar,
  Clock3,
  Copy,
  GitBranch,
  Globe,
  LayoutGrid,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  TerminalSquare,
  Timer,
  Trash2,
  Webhook,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import {
  executePipelineAiAgentAction,
  type PipelineAiAgentExecutionInput,
} from '@/app/pipeline/actions';
import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type PipelineNodeKind =
  | 'manualStart'
  | 'webhookTrigger'
  | 'scheduleTrigger'
  | 'http'
  | 'browser'
  | 'aiAgent'
  | 'transform'
  | 'condition'
  | 'delay'
  | 'googleCalendar'
  | 'database'
  | 'end';

type PipelineNodeStatus = 'idle' | 'running' | 'success' | 'error';

type PipelineNodeData = {
  label: string;
  kind: PipelineNodeKind;
  category: string;
  description: string;
  summary: string;
  subtitle: string;
  status: PipelineNodeStatus;
  activity: string;
  intelligencePromptMode?: 'existing' | 'new';
  intelligencePromptId?: string;
  intelligencePrimaryModelId?: number | null;
  intelligenceFallbackModelId?: number | null;
  intelligencePrimaryAccessKey?: number | null;
  intelligenceFallbackAccessKey?: number | null;
  intelligenceMaxTokens?: number | null;
  intelligenceMasterPrompt?: string;
  intelligencePrompt?: string;
  intelligenceContext?: string;
  intelligenceLastResponse?: string;
  intelligenceLastModel?: string;
  intelligenceLastRenderedPrompt?: string;
};

type PipelineFlowNode = Node<PipelineNodeData>;

type NodeTemplate = {
  kind: PipelineNodeKind;
  label: string;
  subtitle: string;
  category: string;
  description: string;
  summary: string;
  icon: LucideIcon;
};

type NodeCategory = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  templates: NodeTemplate[];
};

type IntelligenceModelOption = {
  id: number;
  title: string;
  provider: string;
  model: string;
};

type IntelligencePromptOption = {
  id: number;
  promptId: string;
  primaryModelId: number | null;
  fallbackModelId: number | null;
  primaryAccessKey: number | null;
  fallbackAccessKey: number | null;
  maxTokens: number | null;
  defPrompt: string | null;
};

type IntelligenceTokenOption = {
  id: number;
  name: string;
};

type PipelineEditorProps = {
  intelligenceModels: IntelligenceModelOption[];
  intelligencePrompts: IntelligencePromptOption[];
  intelligenceTokens: IntelligenceTokenOption[];
};

const STORAGE_KEY = 'neup-cloud-pipeline-editor-v2';

const nodeCategories: NodeCategory[] = [
  {
    id: 'triggers',
    label: 'Triggers',
    description: 'Start a flow manually, on schedule, or from incoming events.',
    icon: Play,
    templates: [
      {
        kind: 'manualStart',
        label: 'Manual Start',
        subtitle: 'Run from dashboard',
        category: 'Triggers',
        description: 'Launch the pipeline on demand from the editor or a control surface.',
        summary: 'Good for draft flows and operator-driven actions.',
        icon: Play,
      },
      {
        kind: 'webhookTrigger',
        label: 'Webhook',
        subtitle: 'HTTP event',
        category: 'Triggers',
        description: 'Receive data from external services over an incoming HTTP request.',
        summary: 'Useful for lead capture, Git events, and custom automations.',
        icon: Webhook,
      },
      {
        kind: 'scheduleTrigger',
        label: 'Schedule',
        subtitle: 'Time-based',
        category: 'Triggers',
        description: 'Run this workflow on a recurring schedule.',
        summary: 'Great for daily digests, sync jobs, and periodic checks.',
        icon: Clock3,
      },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    description: 'Execute API calls, browser work, AI tasks, and storage steps.',
    icon: Zap,
    templates: [
      {
        kind: 'http',
        label: 'HTTP Request',
        subtitle: 'External API',
        category: 'Actions',
        description: 'Call a service, webhook, or private API endpoint.',
        summary: 'Use it to fetch data, post payloads, or trigger downstream systems.',
        icon: Globe,
      },
      {
        kind: 'browser',
        label: 'Browser',
        subtitle: 'Visual automation',
        category: 'Actions',
        description: 'Automate a browser task such as loading a page or submitting a form.',
        summary: 'Helpful for scraping, QA flows, and portal interactions.',
        icon: LayoutGrid,
      },
      {
        kind: 'aiAgent',
        label: 'AI Agent',
        subtitle: 'Reasoning step',
        category: 'Actions',
        description: 'Run a prompt-driven task for summarization, routing, or generation.',
        summary: 'Use AI for scoring, drafting, and language-heavy decision points.',
        icon: Bot,
      },
      {
        kind: 'database',
        label: 'Database',
        subtitle: 'Read and write',
        category: 'Actions',
        description: 'Store outputs or hydrate the flow with context from a database.',
        summary: 'Useful for stateful workflows and audit-friendly persistence.',
        icon: SquareTerminal,
      },
    ],
  },
  {
    id: 'logic',
    label: 'Logic',
    description: 'Control how data moves and when the flow branches.',
    icon: GitBranch,
    templates: [
      {
        kind: 'transform',
        label: 'Transform',
        subtitle: 'Shape payload',
        category: 'Logic',
        description: 'Normalize, map, or enrich incoming data before the next step.',
        summary: 'Keep downstream nodes small by reshaping data early.',
        icon: Sparkles,
      },
      {
        kind: 'condition',
        label: 'Condition',
        subtitle: 'If / else',
        category: 'Logic',
        description: 'Branch based on filters or rule checks.',
        summary: 'Send data to different paths depending on its contents.',
        icon: GitBranch,
      },
      {
        kind: 'delay',
        label: 'Delay',
        subtitle: 'Wait state',
        category: 'Logic',
        description: 'Pause the execution before continuing.',
        summary: 'Useful for rate limits, follow-up windows, or retries.',
        icon: Timer,
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connect the flow to concrete tools and endpoints.',
    icon: Calendar,
    templates: [
      {
        kind: 'googleCalendar',
        label: 'Google Calendar',
        subtitle: 'Event automation',
        category: 'Integrations',
        description: 'Create, update, or inspect events from the workflow.',
        summary: 'Coordinate scheduling directly from the automation canvas.',
        icon: Calendar,
      },
      {
        kind: 'end',
        label: 'End',
        subtitle: 'Stop flow',
        category: 'Output',
        description: 'Mark the clean finish of the pipeline.',
        summary: 'Use it to make flow endings explicit and readable.',
        icon: ShieldCheck,
      },
    ],
  },
];

const templateMap = new Map(
  nodeCategories.flatMap((category) => category.templates.map((template) => [template.kind, template] as const))
);

const initialNodes: PipelineFlowNode[] = [
  {
    id: 'manual-start',
    type: 'pipelineNode',
    position: { x: 100, y: 180 },
    data: {
      label: 'Manual Start',
      kind: 'manualStart',
      category: 'Triggers',
      description: 'Kick off the workflow from Neup.Cloud.',
      summary: 'A great entry point while the pipeline is still evolving.',
      subtitle: 'Run from dashboard',
      status: 'idle',
      activity: 'Waiting for operator input.',
    },
  },
  {
    id: 'http-fetch',
    type: 'pipelineNode',
    position: { x: 430, y: 180 },
    data: {
      label: 'Fetch Lead',
      kind: 'http',
      category: 'Actions',
      description: 'Pull lead metadata from the upstream CRM endpoint.',
      summary: 'The flow enriches the raw trigger payload before scoring it.',
      subtitle: 'External API',
      status: 'idle',
      activity: 'Ready to request remote data.',
    },
  },
  {
    id: 'score-ai',
    type: 'pipelineNode',
    position: { x: 760, y: 180 },
    data: {
      label: 'Score with AI',
      kind: 'aiAgent',
      category: 'Actions',
      description: 'Classify urgency, estimate fit, and draft a response outline.',
      summary: 'AI turns raw lead info into something the team can act on quickly.',
      subtitle: 'Reasoning step',
      status: 'idle',
      activity: 'Prepared to analyze incoming context.',
      intelligencePromptMode: 'new',
      intelligencePromptId: '',
      intelligencePrimaryModelId: null,
      intelligenceFallbackModelId: null,
      intelligencePrimaryAccessKey: null,
      intelligenceFallbackAccessKey: null,
      intelligenceMaxTokens: 500,
      intelligenceMasterPrompt: 'Score the lead, explain the reasoning, and return a concise structured summary.',
      intelligencePrompt: 'Review this lead and decide whether we should schedule a follow-up.',
      intelligenceContext: '{\n  "lead": {\n    "name": "Acme Corp",\n    "intent": "High",\n    "budget": "Enterprise"\n  }\n}',
      intelligenceLastResponse: '',
      intelligenceLastModel: '',
      intelligenceLastRenderedPrompt: '',
    },
  },
  {
    id: 'calendar-follow-up',
    type: 'pipelineNode',
    position: { x: 1090, y: 180 },
    data: {
      label: 'Schedule Follow-up',
      kind: 'googleCalendar',
      category: 'Integrations',
      description: 'Create a follow-up slot for qualified leads.',
      summary: 'Calendar placement happens only after the flow has enough confidence.',
      subtitle: 'Event automation',
      status: 'idle',
      activity: 'Awaiting a qualified lead result.',
    },
  },
];

const initialEdges: Edge[] = [
  createEdge('manual-start', 'http-fetch'),
  createEdge('http-fetch', 'score-ai'),
  createEdge('score-ai', 'calendar-follow-up'),
];

function createEdge(source: string, target: string): Edge {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    style: { stroke: 'hsl(var(--foreground) / 0.38)', strokeWidth: 1.6 },
  };
}

function getNodeTone(kind: PipelineNodeKind) {
  switch (kind) {
    case 'manualStart':
    case 'webhookTrigger':
    case 'scheduleTrigger':
      return {
        header: 'from-emerald-500 to-teal-500',
        soft: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
      };
    case 'http':
    case 'browser':
    case 'database':
      return {
        header: 'from-sky-500 to-blue-600',
        soft: 'bg-sky-500/10 text-sky-700 border-sky-200',
      };
    case 'aiAgent':
      return {
        header: 'from-indigo-500 to-violet-600',
        soft: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
      };
    case 'transform':
    case 'condition':
    case 'delay':
      return {
        header: 'from-amber-500 to-orange-500',
        soft: 'bg-amber-500/10 text-amber-700 border-amber-200',
      };
    case 'googleCalendar':
      return {
        header: 'from-cyan-500 to-sky-600',
        soft: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
      };
    case 'end':
      return {
        header: 'from-slate-500 to-slate-700',
        soft: 'bg-slate-500/10 text-slate-700 border-slate-200',
      };
    default:
      return {
        header: 'from-primary to-primary/80',
        soft: 'bg-primary/10 text-primary border-primary/20',
      };
  }
}

function getStatusAppearance(status: PipelineNodeStatus) {
  switch (status) {
    case 'running':
      return {
        frame: 'border-amber-300 shadow-[0_20px_50px_rgba(245,158,11,0.18)] ring-2 ring-amber-200/70',
        dot: 'bg-amber-500',
        label: 'Running',
      };
    case 'success':
      return {
        frame: 'border-emerald-300 shadow-[0_20px_50px_rgba(16,185,129,0.16)] ring-2 ring-emerald-200/70',
        dot: 'bg-emerald-500',
        label: 'Success',
      };
    case 'error':
      return {
        frame: 'border-rose-300 shadow-[0_20px_50px_rgba(244,63,94,0.16)] ring-2 ring-rose-200/70',
        dot: 'bg-rose-500',
        label: 'Error',
      };
    default:
      return {
        frame: 'border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
        dot: 'bg-slate-300',
        label: 'Idle',
      };
  }
}

function createNode(
  kind: PipelineNodeKind,
  position: { x: number; y: number },
  overrides?: Partial<PipelineNodeData>
): PipelineFlowNode {
  const template = templateMap.get(kind);
  const id = `${kind}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    type: 'pipelineNode',
    position,
    data: {
      label: template?.label ?? 'Node',
      kind,
      category: template?.category ?? 'Custom',
      description: template?.description ?? 'Configure this step.',
      summary: template?.summary ?? 'Workflow node.',
      subtitle: template?.subtitle ?? 'Automation step',
      status: 'idle',
      activity: `Ready to run ${template?.label?.toLowerCase() ?? 'node'}.`,
      ...(kind === 'aiAgent'
        ? {
            intelligencePromptMode: 'new' as const,
            intelligencePromptId: '',
            intelligencePrimaryModelId: null,
            intelligenceFallbackModelId: null,
            intelligencePrimaryAccessKey: null,
            intelligenceFallbackAccessKey: null,
            intelligenceMaxTokens: 500,
            intelligenceMasterPrompt: '',
            intelligencePrompt: '',
            intelligenceContext: '',
            intelligenceLastResponse: '',
            intelligenceLastModel: '',
            intelligenceLastRenderedPrompt: '',
          }
        : {}),
      ...overrides,
    },
  };
}

function PipelineCanvasNode({ id, data, selected }: NodeProps<PipelineNodeData>) {
  const template = templateMap.get(data.kind);
  const Icon = template?.icon ?? Workflow;
  const tone = getNodeTone(data.kind);
  const status = getStatusAppearance(data.status);

  return (
    <div
      className={cn(
        'group relative w-[260px] rounded-[1.7rem] border bg-white/95 transition-all duration-300 backdrop-blur-sm',
        selected ? 'border-primary shadow-[0_24px_64px_rgba(15,23,42,0.18)] ring-2 ring-primary/20' : status.frame
      )}
    >
      <div className="absolute -top-2 -right-2 z-20 flex items-center gap-2 rounded-full border border-white/80 bg-white px-2.5 py-1 shadow-lg">
        <span className={cn('h-2.5 w-2.5 rounded-full', status.dot)} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{status.label}</span>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-6px] !h-3 !w-3 !border-2 !border-white !bg-slate-900"
      />

      <div className={cn('rounded-t-[1.7rem] bg-gradient-to-r px-4 py-4 text-white', tone.header)}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">{data.subtitle}</p>
            <h3 className="truncate text-sm font-semibold">{data.label}</h3>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50">
            {data.category}
          </Badge>
          <span className="text-[11px] text-slate-500">{data.activity}</span>
        </div>

        <p className="text-sm leading-6 text-slate-600">{data.description}</p>

        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs leading-5 text-slate-600">
          {data.summary}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-6px] !h-3 !w-3 !border-2 !border-white !bg-slate-900"
      />

      <button
        type="button"
        aria-label="Add child node"
        onClick={(event) => {
          event.stopPropagation();
          window.dispatchEvent(new CustomEvent('pipeline:add-child', { detail: { nodeId: id } }));
        }}
        className="absolute -right-8 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-md transition-all group-hover:opacity-100 hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  pipelineNode: PipelineCanvasNode,
};

function buildModelLabel(model: IntelligenceModelOption): string {
  return `${model.title} (${model.provider}:${model.model})`;
}

function PipelineEditorCanvas({
  intelligenceModels,
  intelligencePrompts,
  intelligenceTokens,
}: PipelineEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PipelineNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>('http-fetch');
  const [activeCategory, setActiveCategory] = useState(nodeCategories[0].id);
  const [search, setSearch] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const [showDebugger, setShowDebugger] = useState(true);
  const [consoleLines, setConsoleLines] = useState<string[]>([
    'Editor ready. Build on the canvas or add a child from any node.',
  ]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { nodes?: PipelineFlowNode[]; edges?: Edge[] };
      if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
        setNodes(parsed.nodes);
        setSelectedId(parsed.nodes[0]?.id ?? null);
      }
      if (Array.isArray(parsed.edges)) {
        setEdges(parsed.edges);
      }
      setConsoleLines((current) => [...current, 'Recovered the last saved local draft.']);
    } catch (error) {
      console.error('Failed to restore pipeline editor state', error);
    }
  }, [setEdges, setNodes]);

  useEffect(() => {
    const handleAddChild = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string }>).detail;
      setPendingParentId(detail.nodeId);
      setSelectedId(detail.nodeId);
      setConsoleLines((current) => [...current, 'Select a node from the library to attach a child step.']);
    };

    window.addEventListener('pipeline:add-child', handleAddChild);
    return () => window.removeEventListener('pipeline:add-child', handleAddChild);
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId]
  );
  const promptOptionMap = useMemo(
    () => new Map(intelligencePrompts.map((prompt) => [prompt.promptId, prompt])),
    [intelligencePrompts]
  );

  const filteredTemplates = useMemo(() => {
    const active = nodeCategories.find((category) => category.id === activeCategory) ?? nodeCategories[0];
    const source = active.templates;
    if (!search.trim()) {
      return source;
    }

    const normalized = search.trim().toLowerCase();
    return source.filter((template) =>
      [template.label, template.subtitle, template.description].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [activeCategory, search]);

  const flowNodes = useMemo(() => {
    return [...nodes].sort((left, right) => {
      if (left.position.x === right.position.x) {
        return left.position.y - right.position.y;
      }
      return left.position.x - right.position.x;
    });
  }, [nodes]);

  const appendConsole = useCallback((line: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLines((current) => [...current, `${time} | ${line}`]);
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      const sourceId = connection.source ?? undefined;
      const targetId = connection.target ?? undefined;

      if (!sourceId || !targetId) {
        return;
      }

      setEdges((currentEdges) => addEdge(createEdge(sourceId, targetId), currentEdges));
      appendConsole('Created a connection between two nodes.');
    },
    [appendConsole, setEdges]
  );

  const handleSave = useCallback(() => {
    setSaveState('saving');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    appendConsole('Saved the local pipeline draft.');

    window.setTimeout(() => {
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1400);
    }, 260);
  }, [appendConsole, edges, nodes]);

  const handleReset = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedId('http-fetch');
    setPendingParentId(null);
    window.localStorage.removeItem(STORAGE_KEY);
    appendConsole('Reset the editor back to the starter flow.');
  }, [appendConsole, setEdges, setNodes]);

  const handleAddNode = useCallback(
    (kind: PipelineNodeKind) => {
      const parentId = pendingParentId ?? selectedId;
      const parentNode = parentId ? nodes.find((node) => node.id === parentId) ?? null : null;
      const nextPosition = parentNode
        ? {
            x: parentNode.position.x + 320,
            y: parentNode.position.y + (edges.filter((edge) => edge.source === parentNode.id).length * 140 - 40),
          }
        : {
            x: 140 + nodes.length * 60,
            y: 180 + ((nodes.length % 3) * 130),
          };

      const newNode = createNode(kind, nextPosition);
      setNodes((currentNodes) => [...currentNodes, newNode]);

      if (parentNode) {
        setEdges((currentEdges) => [...currentEdges, createEdge(parentNode.id, newNode.id)]);
        appendConsole(`Added ${newNode.data.label} after ${parentNode.data.label}.`);
      } else {
        appendConsole(`Added ${newNode.data.label} to the canvas.`);
      }

      setSelectedId(newNode.id);
      setPendingParentId(null);
    },
    [appendConsole, edges, nodes, pendingParentId, selectedId, setEdges, setNodes]
  );

  const handleDuplicate = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    const duplicate = createNode(
      selectedNode.data.kind,
      {
        x: selectedNode.position.x + 30,
        y: selectedNode.position.y + 150,
      },
      {
        ...selectedNode.data,
        label: `${selectedNode.data.label} Copy`,
        status: 'idle',
        activity: 'Duplicated from existing step.',
      }
    );

    setNodes((currentNodes) => [...currentNodes, duplicate]);
    setSelectedId(duplicate.id);
    appendConsole(`Duplicated ${selectedNode.data.label}.`);
  }, [appendConsole, selectedNode, setNodes]);

  const handleDelete = useCallback(() => {
    if (!selectedId) {
      return;
    }

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedId));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setPendingParentId((current) => (current === selectedId ? null : current));
    setSelectedId(null);
    appendConsole('Removed the selected node from the flow.');
  }, [appendConsole, selectedId, setEdges, setNodes]);

  const updateSelectedNode = useCallback(
    (patch: Partial<PipelineNodeData>) => {
      if (!selectedId) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === selectedId
            ? { ...node, data: { ...node.data, ...patch } }
            : node
        )
      );
    },
    [selectedId, setNodes]
  );

  const executeAiAgentNode = useCallback(
    async (node: PipelineFlowNode) => {
      if (node.data.kind !== 'aiAgent') {
        return null;
      }

      const actionInput: PipelineAiAgentExecutionInput = {
        promptMode: node.data.intelligencePromptMode ?? 'new',
        promptId: node.data.intelligencePromptId?.trim() || null,
        primaryModelId: node.data.intelligencePrimaryModelId ?? null,
        fallbackModelId: node.data.intelligenceFallbackModelId ?? null,
        primaryAccessKey: node.data.intelligencePrimaryAccessKey ?? null,
        fallbackAccessKey: node.data.intelligenceFallbackAccessKey ?? null,
        maxTokens: node.data.intelligenceMaxTokens ?? null,
        masterPrompt: node.data.intelligenceMasterPrompt?.trim() || null,
        prompt: node.data.intelligencePrompt?.trim() || '',
        context: node.data.intelligenceContext?.trim() || null,
      };

      setNodes((currentNodes) =>
        currentNodes.map((currentNode) =>
          currentNode.id === node.id
            ? {
                ...currentNode,
                data: {
                  ...currentNode.data,
                  status: 'running',
                  activity: 'Generating intelligence response...',
                },
              }
            : currentNode
        )
      );

      appendConsole(`AI Agent "${node.data.label}" is preparing a prompt record.`);

      try {
        const result = await executePipelineAiAgentAction(actionInput);
        const compactResponse =
          result.responseText.length > 220
            ? `${result.responseText.slice(0, 220).trim()}...`
            : result.responseText;

        setNodes((currentNodes) =>
          currentNodes.map((currentNode) =>
            currentNode.id === node.id
              ? {
                  ...currentNode,
                  data: {
                    ...currentNode.data,
                    status: 'success',
                    activity: `Response generated via ${result.usedModel}.`,
                    intelligencePromptId: result.promptId,
                    intelligenceLastResponse: result.responseText,
                    intelligenceLastModel: result.usedModel,
                    intelligenceLastRenderedPrompt: result.renderedPrompt,
                    summary: compactResponse || currentNode.data.summary,
                  },
                }
              : currentNode
          )
        );

        appendConsole(
          `${result.createdPrompt ? 'Created' : 'Updated'} prompt ${result.promptId} and generated a response with ${result.usedModel}.`
        );

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate AI response';

        setNodes((currentNodes) =>
          currentNodes.map((currentNode) =>
            currentNode.id === node.id
              ? {
                  ...currentNode,
                  data: {
                    ...currentNode.data,
                    status: 'error',
                    activity: message,
                  },
                }
              : currentNode
          )
        );

        appendConsole(`AI Agent "${node.data.label}" failed: ${message}`);
        throw error;
      }
    },
    [appendConsole, setNodes]
  );

  const handleRun = useCallback(async () => {
    if (isRunning || flowNodes.length === 0) {
      return;
    }

    setIsRunning(true);
    setShowDebugger(true);
    appendConsole(`Starting a ${flowNodes.length}-step simulation run.`);
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, data: { ...node.data, status: 'idle' } }))
    );

    try {
      for (const node of flowNodes) {
        if (node.data.kind === 'aiAgent') {
          await executeAiAgentNode(node);
          continue;
        }

        setNodes((currentNodes) =>
          currentNodes.map((currentNode) =>
            currentNode.id === node.id
              ? {
                  ...currentNode,
                  data: {
                    ...currentNode.data,
                    status: 'running',
                    activity: 'Executing now...',
                  },
                }
              : currentNode
          )
        );
        appendConsole(`Running ${node.data.label}.`);

        await new Promise((resolve) => window.setTimeout(resolve, 420));

        setNodes((currentNodes) =>
          currentNodes.map((currentNode) =>
            currentNode.id === node.id
              ? {
                  ...currentNode,
                  data: {
                    ...currentNode.data,
                    status: 'success',
                    activity: 'Completed successfully.',
                  },
                }
              : currentNode
          )
        );
        appendConsole(`Completed ${node.data.label}.`);
      }

      appendConsole('Pipeline simulation finished.');
    } finally {
      setIsRunning(false);
    }
  }, [appendConsole, executeAiAgentNode, flowNodes, isRunning, setNodes]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2f5_100%)] text-foreground">
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-white/70 bg-white/85 px-4 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Logo />
              <div className="hidden h-10 w-px bg-border md:block" />
              <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white">
                <Link href="/pipeline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Pipeline home
                </Link>
              </Button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Plain Workspace</p>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">Pipeline Editor</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={() => setShowDebugger((current) => !current)}>
                <TerminalSquare className="mr-2 h-4 w-4" />
                {showDebugger ? 'Hide logs' : 'Show logs'}
              </Button>
              <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={handleReset}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save'}
              </Button>
              <Button className="rounded-full" onClick={handleRun} disabled={isRunning}>
                <Play className="mr-2 h-4 w-4" />
                {isRunning ? 'Running...' : 'Run flow'}
              </Button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="relative h-[calc(100vh-81px)] overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_36%)]" />

            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.3}
              maxZoom={1.5}
              zoomOnScroll={false}
              zoomOnPinch
              panOnScroll
              panOnScrollMode={PanOnScrollMode.Free}
              defaultEdgeOptions={{
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
                style: { stroke: 'hsl(var(--foreground) / 0.35)', strokeWidth: 1.6 },
              }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(_, node) => {
                setSelectedId(node.id);
                setPendingParentId(null);
              }}
              onPaneClick={() => {
                setSelectedId(null);
                setPendingParentId(null);
              }}
              className="bg-transparent"
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={22} size={1.1} color="hsl(var(--border))" />
              <Controls className="!rounded-2xl !border !border-white/70 !bg-white/95 !shadow-xl" position="bottom-right" />
            </ReactFlow>
          </main>

          <aside className="border-l border-white/60 bg-white/60">
            <ScrollArea className="h-[calc(100vh-81px)]">
              <div className="space-y-5 p-5">
                {selectedNode ? (
                  <>
                    <div className="rounded-[1.7rem] border border-white/80 bg-white/92 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Inspector</p>
                          <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedNode.data.label}</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Adjust the selected step without leaving the canvas.
                          </p>
                        </div>
                        <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50">
                          {selectedNode.data.kind}
                        </Badge>
                      </div>
                    </div>

                    {selectedNode.data.kind === 'aiAgent' ? (
                      <Card className="rounded-[1.7rem] border-white/80 bg-white/92 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base text-slate-950">Intelligence Agent</CardTitle>
                          <CardDescription>
                            Use the saved intelligence models, prompt records, and token bindings from Neup.Cloud.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant={selectedNode.data.intelligencePromptMode === 'existing' ? 'default' : 'outline'}
                              className="rounded-2xl"
                              onClick={() => updateSelectedNode({ intelligencePromptMode: 'existing' })}
                            >
                              Existing prompt
                            </Button>
                            <Button
                              variant={selectedNode.data.intelligencePromptMode === 'new' ? 'default' : 'outline'}
                              className="rounded-2xl"
                              onClick={() => updateSelectedNode({ intelligencePromptMode: 'new' })}
                            >
                              New prompt
                            </Button>
                          </div>

                          {selectedNode.data.intelligencePromptMode === 'existing' ? (
                            <div className="space-y-2">
                              <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Prompt ID
                              </label>
                              <select
                                value={selectedNode.data.intelligencePromptId ?? ''}
                                onChange={(event) => {
                                  const prompt = promptOptionMap.get(event.target.value);

                                  updateSelectedNode({
                                    intelligencePromptId: event.target.value,
                                    intelligencePrimaryModelId: prompt?.primaryModelId ?? null,
                                    intelligenceFallbackModelId: prompt?.fallbackModelId ?? null,
                                    intelligencePrimaryAccessKey: prompt?.primaryAccessKey ?? null,
                                    intelligenceFallbackAccessKey: prompt?.fallbackAccessKey ?? null,
                                    intelligenceMaxTokens: prompt?.maxTokens ?? null,
                                    intelligenceMasterPrompt: prompt?.defPrompt ?? '',
                                  });
                                }}
                                className="flex h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                              >
                                <option value="">Select a saved prompt</option>
                                {intelligencePrompts.map((prompt) => (
                                  <option key={prompt.id} value={prompt.promptId}>
                                    {prompt.promptId}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Prompt ID
                              </label>
                              <Input
                                value={selectedNode.data.intelligencePromptId ?? ''}
                                onChange={(event) => updateSelectedNode({ intelligencePromptId: event.target.value })}
                                placeholder="Leave blank to auto-generate"
                                className="rounded-2xl border-slate-200 bg-slate-50"
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Primary model
                            </label>
                            <select
                              value={selectedNode.data.intelligencePrimaryModelId ? String(selectedNode.data.intelligencePrimaryModelId) : ''}
                              onChange={(event) =>
                                updateSelectedNode({
                                  intelligencePrimaryModelId: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                              className="flex h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                            >
                              <option value="">Select primary model</option>
                              {intelligenceModels.map((model) => (
                                <option key={model.id} value={String(model.id)}>
                                  {buildModelLabel(model)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Fallback model
                            </label>
                            <select
                              value={selectedNode.data.intelligenceFallbackModelId ? String(selectedNode.data.intelligenceFallbackModelId) : ''}
                              onChange={(event) =>
                                updateSelectedNode({
                                  intelligenceFallbackModelId: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                              className="flex h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                            >
                              <option value="">No fallback model</option>
                              {intelligenceModels.map((model) => (
                                <option key={model.id} value={String(model.id)}>
                                  {buildModelLabel(model)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Primary token
                            </label>
                            <select
                              value={selectedNode.data.intelligencePrimaryAccessKey ? String(selectedNode.data.intelligencePrimaryAccessKey) : ''}
                              onChange={(event) =>
                                updateSelectedNode({
                                  intelligencePrimaryAccessKey: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                              className="flex h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                            >
                              <option value="">Select primary token</option>
                              {intelligenceTokens.map((token) => (
                                <option key={token.id} value={String(token.id)}>
                                  {token.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Fallback token
                            </label>
                            <select
                              value={selectedNode.data.intelligenceFallbackAccessKey ? String(selectedNode.data.intelligenceFallbackAccessKey) : ''}
                              onChange={(event) =>
                                updateSelectedNode({
                                  intelligenceFallbackAccessKey: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                              className="flex h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                            >
                              <option value="">No fallback token</option>
                              {intelligenceTokens.map((token) => (
                                <option key={token.id} value={String(token.id)}>
                                  {token.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Max tokens
                            </label>
                            <Input
                              type="number"
                              min={1}
                              value={selectedNode.data.intelligenceMaxTokens ?? ''}
                              onChange={(event) =>
                                updateSelectedNode({
                                  intelligenceMaxTokens: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                              className="rounded-2xl border-slate-200 bg-slate-50"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Master prompt
                            </label>
                            <Textarea
                              value={selectedNode.data.intelligenceMasterPrompt ?? ''}
                              onChange={(event) => updateSelectedNode({ intelligenceMasterPrompt: event.target.value })}
                              className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Prompt
                            </label>
                            <Textarea
                              value={selectedNode.data.intelligencePrompt ?? ''}
                              onChange={(event) => updateSelectedNode({ intelligencePrompt: event.target.value })}
                              className="min-h-[100px] rounded-2xl border-slate-200 bg-slate-50"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Context
                            </label>
                            <Textarea
                              value={selectedNode.data.intelligenceContext ?? ''}
                              onChange={(event) => updateSelectedNode({ intelligenceContext: event.target.value })}
                              className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50"
                            />
                          </div>

                          <Button
                            className="w-full rounded-2xl"
                            onClick={async () => {
                              try {
                                await executeAiAgentNode(selectedNode);
                              } catch {
                                // Node state and debugger logs already capture the failure.
                              }
                            }}
                          >
                            <Bot className="mr-2 h-4 w-4" />
                            Generate response
                          </Button>

                          {selectedNode.data.intelligenceLastResponse ? (
                            <div className="space-y-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  Last response
                                </p>
                                {selectedNode.data.intelligenceLastModel ? (
                                  <Badge className="rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-white">
                                    {selectedNode.data.intelligenceLastModel}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {selectedNode.data.intelligenceLastResponse}
                              </p>
                              {selectedNode.data.intelligenceLastRenderedPrompt ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    Rendered prompt
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                                    {selectedNode.data.intelligenceLastRenderedPrompt}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    ) : null}

                    <Card className="rounded-[1.7rem] border-white/80 bg-white/92 shadow-sm">
                      <CardContent className="space-y-4 p-5">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Label
                          </label>
                          <Input
                            value={selectedNode.data.label}
                            onChange={(event) => updateSelectedNode({ label: event.target.value })}
                            className="rounded-2xl border-slate-200 bg-slate-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Description
                          </label>
                          <Textarea
                            value={selectedNode.data.description}
                            onChange={(event) => updateSelectedNode({ description: event.target.value })}
                            className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Summary
                          </label>
                          <Textarea
                            value={selectedNode.data.summary}
                            onChange={(event) => updateSelectedNode({ summary: event.target.value })}
                            className="min-h-[100px] rounded-2xl border-slate-200 bg-slate-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Activity note
                          </label>
                          <Input
                            value={selectedNode.data.activity}
                            onChange={(event) => updateSelectedNode({ activity: event.target.value })}
                            className="rounded-2xl border-slate-200 bg-slate-50"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[1.7rem] border-white/80 bg-white/92 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base text-slate-950">Quick actions</CardTitle>
                        <CardDescription>Bridge-like editing shortcuts for fast iteration.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-2">
                        <Button variant="outline" className="justify-start rounded-2xl border-slate-200 bg-slate-50" onClick={handleDuplicate}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate node
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start rounded-2xl border-slate-200 bg-slate-50"
                          onClick={() => {
                            setPendingParentId(selectedNode.id);
                            appendConsole(`Choose a node to place after ${selectedNode.data.label}.`);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add child node
                        </Button>
                        <Button variant="destructive" className="justify-start rounded-2xl" onClick={handleDelete}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove node
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <div className="space-y-3 rounded-[1.7rem] border border-white/80 bg-white/90 p-4 shadow-sm">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Node Library</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">Bridge-style categories</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Explore the same trigger, action, logic, and integration grouping used in Neup.Bridge.
                        </p>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search nodes"
                          className="rounded-2xl border-slate-200 bg-slate-50 pl-9"
                        />
                      </div>

                      {pendingParentId ? (
                        <div className="rounded-[1.4rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-slate-700">
                          Adding a child after{' '}
                          <span className="font-semibold">
                            {nodes.find((node) => node.id === pendingParentId)?.data.label ?? 'selected node'}
                          </span>
                          .
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      {nodeCategories.map((category) => {
                        const Icon = category.icon;
                        const isActive = activeCategory === category.id;

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            className={cn(
                              'rounded-[1.5rem] border px-4 py-3 text-left transition-all',
                              isActive
                                ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                                : 'border-white/80 bg-white/85 hover:border-slate-300 hover:bg-white'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  'mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl',
                                  isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className={cn('font-semibold', isActive ? 'text-white' : 'text-slate-950')}>
                                  {category.label}
                                </div>
                                <p className={cn('mt-1 text-sm leading-6', isActive ? 'text-slate-300' : 'text-slate-600')}>
                                  {category.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      {filteredTemplates.map((template) => {
                        const Icon = template.icon;
                        const tone = getNodeTone(template.kind);

                        return (
                          <button
                            key={template.kind}
                            type="button"
                            onClick={() => handleAddNode(template.kind)}
                            className="w-full rounded-[1.5rem] border border-white/80 bg-white/90 p-4 text-left shadow-sm transition-all hover:border-slate-300 hover:bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r text-white', tone.header)}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-950">{template.label}</p>
                                  <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50">
                                    {template.category}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  {template.subtitle}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{template.description}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {filteredTemplates.length === 0 ? (
                        <Card className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 shadow-none">
                          <CardContent className="p-6 text-sm text-slate-500">
                            Nothing matched that search. Try another term or switch categories.
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>

                    <Separator />

                    <div className="rounded-[1.7rem] border border-white/80 bg-white/92 p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Overview</p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-950">Flow outline</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Select a node to edit it, or scan the flow from left to right here.
                      </p>
                    </div>

                    <Card className="rounded-[1.7rem] border-white/80 bg-white/92 shadow-sm">
                      <CardContent className="space-y-3 p-5">
                        {flowNodes.map((node, index) => (
                          (() => {
                            const Icon = templateMap.get(node.data.kind)?.icon ?? Workflow;

                            return (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => setSelectedId(node.id)}
                                className="flex w-full items-center gap-3 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition-all hover:border-slate-300 hover:bg-white"
                              >
                                <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r text-white', getNodeTone(node.data.kind).header)}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-slate-950">{node.data.label}</div>
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{node.data.subtitle}</div>
                                </div>
                                <span className="text-xs text-slate-400">{index + 1}</span>
                              </button>
                            );
                          })()
                        ))}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>

        {showDebugger ? (
          <div className="border-t border-white/70 bg-white/88 shadow-[0_-20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Debugger</p>
                <h2 className="text-sm font-semibold text-slate-950">Run console</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={() => setConsoleLines([])}>
                  Clear logs
                </Button>
                <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={() => setShowDebugger(false)}>
                  Hide
                </Button>
              </div>
            </div>

            <ScrollArea className="h-52 border-t border-slate-100">
              <div className="space-y-2 px-5 py-4 font-mono text-[12px]">
                {consoleLines.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                    No debugger output yet.
                  </div>
                ) : (
                  consoleLines.map((line, index) => (
                    <div key={`${line}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PipelineEditor(props: PipelineEditorProps) {
  return (
    <ReactFlowProvider>
      <PipelineEditorCanvas {...props} />
    </ReactFlowProvider>
  );
}
