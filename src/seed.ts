import type { Pipe, SpareReed, SpareApplication, MaintenanceReport } from "./types";

// 初始音管台账
export const seedPipes: Pipe[] = [
  {
    id: "p1",
    venue: "St. Mary 教堂",
    stop: "Trumpet 8'",
    pipeNo: "T-01",
    pitch: "C#4",
    centDeviation: 9,
    temperature: 18,
    humidity: 52,
    reedStatus: "abnormal",
    notes: "簧片需微调，有杂音",
    status: "abnormal",
  },
  {
    id: "p2",
    venue: "St. Mary 教堂",
    stop: "Principal 4'",
    pipeNo: "P-02",
    pitch: "G3",
    centDeviation: -3,
    temperature: 18,
    humidity: 52,
    reedStatus: "normal",
    notes: "正常",
    status: "normal",
  },
  {
    id: "p3",
    venue: "St. Mary 教堂",
    stop: "Bourdon 16'",
    pipeNo: "B-03",
    pitch: "F2",
    centDeviation: -12,
    temperature: 17,
    humidity: 55,
    reedStatus: "abnormal",
    notes: "标记复检，簧片响应迟钝",
    status: "abnormal",
  },
  {
    id: "p4",
    venue: "ConcertHall A",
    stop: "Trumpet 8'",
    pipeNo: "T-05",
    pitch: "C#4",
    centDeviation: 14,
    temperature: 21,
    humidity: 48,
    reedStatus: "abnormal",
    notes: "簧片偏差超限，需更换",
    status: "abnormal",
  },
  {
    id: "p5",
    venue: "ConcertHall A",
    stop: "Mixture V",
    pipeNo: "M-08",
    pitch: "C5",
    centDeviation: 2,
    temperature: 21,
    humidity: 48,
    reedStatus: "normal",
    notes: "正常",
    status: "normal",
  },
  {
    id: "p6",
    venue: "Abbey Room",
    stop: "Bourdon 16'",
    pipeNo: "B-11",
    pitch: "F2",
    centDeviation: -6,
    temperature: 16,
    humidity: 60,
    reedStatus: "normal",
    notes: "正常",
    status: "normal",
  },
  {
    id: "p7",
    venue: "Abbey Room",
    stop: "Principal 4'",
    pipeNo: "P-13",
    pitch: "G4",
    centDeviation: 11,
    temperature: 16,
    humidity: 60,
    reedStatus: "abnormal",
    notes: "簧片振动异常",
    status: "abnormal",
  },
];

// 各场馆备件分开记账（规格 = 音栓 + 音高）
export const seedSpares: SpareReed[] = [
  // St. Mary 教堂
  { id: "s1", venue: "St. Mary 教堂", spec: "Trumpet 8' C#4", quantity: 1, capacity: 2 },
  { id: "s2", venue: "St. Mary 教堂", spec: "Principal 4' G3", quantity: 2, capacity: 2 },
  { id: "s3", venue: "St. Mary 教堂", spec: "Bourdon 16' F2", quantity: 0, capacity: 1 },
  // ConcertHall A
  { id: "s4", venue: "ConcertHall A", spec: "Trumpet 8' C#4", quantity: 1, capacity: 2 },
  { id: "s5", venue: "ConcertHall A", spec: "Mixture V C5", quantity: 1, capacity: 1 },
  // Abbey Room
  { id: "s6", venue: "Abbey Room", spec: "Bourdon 16' F2", quantity: 1, capacity: 1 },
  { id: "s7", venue: "Abbey Room", spec: "Principal 4' G4", quantity: 0, capacity: 1 },
];

export const seedApplications: SpareApplication[] = [];

export const seedReports: MaintenanceReport[] = [];

export const VENUES = ["St. Mary 教堂", "ConcertHall A", "Abbey Room"];

export const TECHNICIANS = ["张技师", "李技师", "王技师"];

export const SUPERVISOR_NAME = "琴房主管";
