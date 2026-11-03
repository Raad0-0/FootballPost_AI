import { useEffect, useState } from "react";
import { deleteDraft, getDrafts, updateDraft } from "../api/drafts";
import type { DraftStatus, PostDraft } from "../types/draft";

export function useDrafts(workspaceId: number | string) {
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const data = await getDrafts(workspaceId, {
        status: statusFilter || undefined,
        post_type: typeFilter || undefined,
      });
      setDrafts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load post drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [workspaceId, statusFilter, typeFilter]);

  const editDraft = async (draftId: number, content: string) => {
    const updated = await updateDraft(draftId, { content });
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? updated : d)));
    return updated;
  };

  const changeStatus = async (draftId: number, status: DraftStatus) => {
    const updated = await updateDraft(draftId, { status });
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? updated : d)));
    return updated;
  };

  const copyDraftToClipboard = async (draft: PostDraft) => {
    await navigator.clipboard.writeText(draft.content);
    // Automatically transition to "copied" if currently "new" or "edited"
    if (draft.status === "new" || draft.status === "edited") {
      await changeStatus(draft.id, "copied");
    }
  };

  const removeDraft = async (draftId: number) => {
    await deleteDraft(draftId);
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  return {
    drafts,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    refresh: loadDrafts,
    editDraft,
    changeStatus,
    copyDraftToClipboard,
    removeDraft,
  };
}

