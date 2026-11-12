export interface LFCluster { id: string; label: string; color?: string }
export interface LFNodeInput { id: string; cluster: string; title: string; summary?: string; fx?: number; fy?: number; [k: string]: unknown }
export interface LFLinkInput { source: string; target: string; label?: string }
export type LFTourStep =
  | { node: string; note: string; open?: boolean; zoom?: number }
  | { pins: string[]; note: string; radius?: number };
export interface LFTour { id?: string; title: string; steps: LFTourStep[] }
export interface LFData { name?: string; clusters: LFCluster[]; nodes: LFNodeInput[]; links: LFLinkInput[]; tours?: LFTour[] }

export interface LFNode extends LFNodeInput { deg: number; x: number; y: number; c: LFCluster & { col: string } }
export interface LFNeighbor { node: LFNode; label: string; outgoing: boolean; sentence: string; seen: boolean; opened: boolean }
export interface LFPin { id: string; letter: string; wx: number; wy: number; wr: number; name: string }
export interface LFBridge { a: LFPin; b: LFPin; links: { from: LFNode; to: LFNode; label: string; sentence: string }[] }
export interface LFStats { startedAt: number; opens: number; rimJumps: number; pinsMade: number }
export interface LFProgress {
  seen: number; opened: number; total: number;
  perCluster: { cluster: LFCluster; total: number; seen: number }[];
  stats: LFStats & { seconds: number };
}
export interface LFState {
  v: 1; reveals: [number, number, number][]; seen: string[]; opened: string[]; current: string | null;
  pins: Omit<LFPin, 'id'>[]; cam: { x: number; y: number; k: number }; lensRadius: number; stats: LFStats;
}
export interface LFTourEvent { title: string; index: number; total: number; step: LFTourStep; bridges: LFBridge[] | null }

export interface LFOptions { lensRadius?: number; magnify?: number; seed?: number; maxPins?: number; startAt?: string | null; minimap?: boolean }

export interface LFEvents {
  open: { node: LFNode; cluster: LFCluster; neighbors: LFNeighbor[]; path: LFNode[] };
  focus: { node: LFNode };
  progress: LFProgress;
  pins: { pins: LFPin[]; bridges: LFBridge[] };
  lens: number;
  tour: LFTourEvent | null;
  statechange: LFState;
  reset: Record<string, never>;
}

export default class Lanternfield {
  constructor(el: HTMLElement, data: LFData, options?: LFOptions);
  on<K extends keyof LFEvents>(type: K, fn: (payload: LFEvents[K]) => void): this;
  off<K extends keyof LFEvents>(type: K, fn: (payload: LFEvents[K]) => void): this;
  open(id: string, o?: { fly?: boolean; zoom?: number }): LFNode | null;
  focus(id: string, o?: { zoom?: number; anchor?: [number, number]; duration?: number }): LFNode | null;
  suggestNext(): { node: LFNode; because: LFNode[] } | null;
  search(q: string): LFNode[];
  neighbors(id: string | LFNode): LFNeighbor[];
  pinLens(): LFPin;
  pinAt(sx: number, sy: number): LFPin;
  pinAtNode(id: string, worldRadius?: number): LFPin | null;
  pinAtWorld(wx: number, wy: number, wr: number): LFPin;
  removePin(id: string): void;
  clearPins(): void;
  bridges(): LFBridge[];
  progress(): LFProgress;
  setLensRadius(px: number): void;
  fit(animate?: boolean): void;
  getState(): LFState;
  setState(s: LFState): boolean;
  reset(): void;
  tourStart(t: LFTour): void;
  tourGo(i: number): void;
  tourNext(): void;
  tourPrev(): void;
  tourStop(): void;
  destroy(): void;
}
