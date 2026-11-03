import React from "react";
import { useParams } from "react-router-dom";
import { DraftCard } from "../components/DraftCard";
import { useDrafts } from "../hooks/useDrafts";

export const DraftsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const {
    drafts,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    editDraft,
    changeStatus,
    copyDraftToClipboard,
    removeDraft,
  } = useDrafts(workspaceId || "");

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "new", label: "New Drafts" },
    { value: "edited", label: "Edited" },
    { value: "copied", label: "Copied" },
    { value: "used", label: "Posted / Used" },
    { value: "discarded", label: "Discarded" },
  ];

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "goal", label: "Goals" },
    { value: "red_card", label: "Red Cards" },
    { value: "halftime", label: "Half-Time" },
    { value: "fulltime", label: "Full-Time" },
    { value: "fixture", label: "Fixtures" },
    { value: "result", label: "Results" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Drafts Queue
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Review, edit, copy, and mark matchday social media post drafts.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500 animate-pulse text-sm">
          Loading drafts queue...
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/40 rounded-2xl border border-dashed border-gray-700 p-8 space-y-2">
          <span className="text-4xl">📝</span>
          <h3 className="font-bold text-gray-200 text-base">No Drafts Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {statusFilter || typeFilter
              ? "No drafts match the selected filters. Try resetting the filter criteria."
              : "Drafts are generated automatically during matches, or when fixtures are scheduled."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onEdit={editDraft}
              onChangeStatus={changeStatus}
              onCopy={copyDraftToClipboard}
              onDelete={removeDraft}
            />
          ))}
        </div>
      )}
    </div>
  );
};

