import { atom } from "jotai";

export const historyAtoms = atom<boolean>(false);
export const activeHistoryIdAtom = atom<string>('');
export const compareModeAtom = atom<boolean>(false);
export const compareVersionsAtom = atom<{ version1: string; version2: string }>({ version1: '', version2: '' });
