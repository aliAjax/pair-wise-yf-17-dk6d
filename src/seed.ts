import type { EnvRecord, Pipe, Venue } from "./types";

export const venues: Venue[] = [
  { id: "st-mary", name: "St.Mary 教堂", kind: "教堂" },
  { id: "concert-a", name: "ConcertHall A 音乐厅", kind: "音乐厅" },
  { id: "abbey", name: "Abbey Room 琴房", kind: "琴房" },
];

export const REED_SPECS = ["8' 黄铜簧舌", "16' 低音簧舌", "4' 高音簧舌"];

export const seedPipes: Pipe[] = [
  { id: "p1", venueId: "st-mary", stop: "Trumpet 8'", pipeNo: "T8-041", pitch: "C#4", cents: 9, reedSpec: "8' 黄铜簧舌", reedStatus: "abnormal", tuned: false, note: "簧片需微调" },
  { id: "p2", venueId: "st-mary", stop: "Oboe 8'", pipeNo: "OB-012", pitch: "A3", cents: 2, reedSpec: "8' 黄铜簧舌", reedStatus: "normal", tuned: true, note: "正常" },
  { id: "p3", venueId: "st-mary", stop: "Principal 4'", pipeNo: "PR-104", pitch: "G3", cents: -3, reedSpec: "4' 高音簧舌", reedStatus: "normal", tuned: true, note: "正常" },
  { id: "p4", venueId: "st-mary", stop: "Bourdon 16'", pipeNo: "BD-016", pitch: "F2", cents: -12, reedSpec: "16' 低音簧舌", reedStatus: "abnormal", tuned: false, note: "标记复检" },
  { id: "p5", venueId: "concert-a", stop: "Principal 4'", pipeNo: "PR-207", pitch: "G3", cents: -3, reedSpec: "4' 高音簧舌", reedStatus: "normal", tuned: true, note: "正常" },
  { id: "p6", venueId: "concert-a", stop: "Trombone 16'", pipeNo: "TB-002", pitch: "C2", cents: 15, reedSpec: "16' 低音簧舌", reedStatus: "abnormal", tuned: false, note: "簧片漏气" },
  { id: "p7", venueId: "concert-a", stop: "Mixture III", pipeNo: "MX-330", pitch: "E4", cents: 1, reedSpec: "4' 高音簧舌", reedStatus: "normal", tuned: true, note: "正常" },
  { id: "p8", venueId: "concert-a", stop: "Trumpet 8'", pipeNo: "T8-118", pitch: "B3", cents: 6, reedSpec: "8' 黄铜簧舌", reedStatus: "normal", tuned: false, note: "待复测" },
  { id: "p9", venueId: "abbey", stop: "Bourdon 16'", pipeNo: "BD-031", pitch: "F2", cents: -12, reedSpec: "16' 低音簧舌", reedStatus: "abnormal", tuned: false, note: "标记复检" },
  { id: "p10", venueId: "abbey", stop: "Flute 8'", pipeNo: "FL-058", pitch: "D4", cents: 4, reedSpec: "8' 黄铜簧舌", reedStatus: "normal", tuned: true, note: "正常" },
  { id: "p11", venueId: "abbey", stop: "Trumpet 8'", pipeNo: "T8-077", pitch: "B3", cents: 7, reedSpec: "8' 黄铜簧舌", reedStatus: "abnormal", tuned: false, note: "簧片需微调" },
];

/** 各场馆分开记账：在库数量 */
export const seedStock: Record<string, Record<string, number>> = {
  "st-mary": { "8' 黄铜簧舌": 2, "16' 低音簧舌": 1, "4' 高音簧舌": 3 },
  "concert-a": { "8' 黄铜簧舌": 1, "16' 低音簧舌": 0, "4' 高音簧舌": 2 },
  abbey: { "8' 黄铜簧舌": 1, "16' 低音簧舌": 1, "4' 高音簧舌": 0 },
};

/** 各场馆库房容量上限 */
export const seedCapacity: Record<string, Record<string, number>> = {
  "st-mary": { "8' 黄铜簧舌": 4, "16' 低音簧舌": 2, "4' 高音簧舌": 3 },
  "concert-a": { "8' 黄铜簧舌": 3, "16' 低音簧舌": 2, "4' 高音簧舌": 2 },
  abbey: { "8' 黄铜簧舌": 2, "16' 低音簧舌": 1, "4' 高音簧舌": 2 },
};

export const seedEnv: Record<string, EnvRecord> = {
  "st-mary": { temp: 19.5, humidity: 55, at: "08:30:00" },
  "concert-a": { temp: 21.0, humidity: 48, at: "08:35:00" },
  abbey: { temp: 18.2, humidity: 61, at: "08:40:00" },
};

export const REPORT_NO = "MR-20261005";
