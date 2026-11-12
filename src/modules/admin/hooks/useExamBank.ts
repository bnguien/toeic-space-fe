import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { examBankApi, type BankFilters } from "../api/exam-bank.api";

/** Query keys of the content APIs; one place so overview, lists and drawers share cache. */
export const bankKeys = {
  all: ["exam-bank"] as const,
  overview: () => [...bankKeys.all, "overview"] as const,
  exams: (filters: BankFilters) => [...bankKeys.all, "exams", filters] as const,
  exam: (id: string) => [...bankKeys.all, "exam", id] as const,
  questions: (filters: BankFilters) => [...bankKeys.all, "questions", filters] as const,
};

export const useBankOverview = () =>
  useQuery({
    queryKey: bankKeys.overview(),
    queryFn: ({ signal }) => examBankApi.overview(signal),
    staleTime: 60 * 1000,
    retry: false,
  });

export const useExams = (filters: BankFilters) =>
  useQuery({
    queryKey: bankKeys.exams(filters),
    queryFn: ({ signal }) => examBankApi.exams(filters, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

export const useExamDetail = (id: string | null | undefined) =>
  useQuery({
    queryKey: bankKeys.exam(id ?? ""),
    queryFn: ({ signal }) => examBankApi.exam(id!, signal),
    enabled: Boolean(id),
    retry: false,
  });

export const useQuestions = (filters: BankFilters) =>
  useQuery({
    queryKey: bankKeys.questions(filters),
    queryFn: ({ signal }) => examBankApi.questions(filters, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
