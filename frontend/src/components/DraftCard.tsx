import React, { useState } from "react";
import { getPostTypeBadge, getStatusBadge } from "../utils/draftRules";
import type { DraftStatus, PostDraft } from "../types/draft";

interface Props {
  draft: PostDraft;
  onEdit: (draftId: number, content: string) => Promise<any>;
  onChangeStatus: (draftId: number, status: DraftStatus) => Promise<any>;
  onCopy: (draft: PostDraft) => Promise<any>;
  onDelete: (draftId: number) => Promise<any>;
}

export const DraftCard: React.FC<Props> = ({
  draft,
  onEdit,
  onChangeStatus,
  onCopy,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(draft.content);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [saving, setSaving] = useState(false);

  const typeBadge = getPostTypeBadge(draft.post_type);
  const statusBadge = getStatusBadge(draft.status);

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await onEdit(draft.id, editText);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await onCopy(draft);
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 2000);
  };

  return (
    <div className="bg-gray-800 border border-gray-700/80 rounded-xl p-4 shadow-sm hover:border-gray-600 transition flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeBadge.bg} ${typeBadge.text}`}>
              {typeBadge.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>

          <span className="text-[11px] text-gray-400">
            {new Date(draft.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Content Body / Text Editor */}
        {isEditing ? (
          <div className="my-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={5}
              className="w-full bg-gray-900 border border-emerald-500/50 rounded-lg p-3 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-sans"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setEditText(draft.content);
                  setIsEditing(false);
                }}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-3.5 my-2 text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
            {draft.content}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700/60 mt-2">
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-200 py-1 px-2 rounded hover:bg-gray-700/50 transition"
              title="Edit text"
            >
              ✏️ Edit
            </button>
          )}

          {draft.status !== "used" && (
            <button
              onClick={() => onChangeStatus(draft.id, "used")}
              className="text-xs text-gray-400 hover:text-purple-300 py-1 px-2 rounded hover:bg-gray-700/50 transition"
              title="Mark as Posted to Facebook"
            >
              ✓ Mark Posted
            </button>
          )}

          {draft.status !== "discarded" && (
            <button
              onClick={() => onChangeStatus(draft.id, "discarded")}
              className="text-xs text-gray-400 hover:text-rose-300 py-1 px-2 rounded hover:bg-gray-700/50 transition"
              title="Discard draft"
            >
              ✕ Discard
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(draft.id)}
            className="text-xs text-gray-500 hover:text-red-400 p-1"
            title="Delete permanently"
          >
            🗑️
          </button>

          {/* Copy to Clipboard Primary Button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
              copiedRecently
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            <span>{copiedRecently ? "✓" : "📋"}</span>
            <span>{copiedRecently ? "Copied!" : "Copy Post"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

