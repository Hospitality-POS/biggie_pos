import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ProjectSelect from "./ProjectSelect";
import { tagProject, ProjectDocType } from "@services/accounting/projects";

interface Props {
    docType: ProjectDocType;
    docId?: string;
    /** Current project: an id or a populated { _id, name } */
    value?: string | { _id: string } | null;
    /** react-query keys to refresh after tagging (prefix match) */
    invalidate?: string[];
    disabled?: boolean;
    width?: number;
}

const idOf = (v: Props["value"]) => (v && typeof v === "object" ? v._id : v) || undefined;

/**
 * Inline project picker for table rows. Changing it tags the document and
 * every journal line it posted, so Profit & Loss per project follows.
 */
const ProjectTagCell: React.FC<Props> = ({ docType, docId, value, invalidate = [], disabled, width = 170 }) => {
    const queryClient = useQueryClient();
    const [current, setCurrent] = useState<string | undefined>(idOf(value));
    const [saving, setSaving] = useState(false);

    useEffect(() => setCurrent(idOf(value)), [value]);

    if (!docId) return null;

    const handleChange = async (next?: string) => {
        const prev = current;
        setCurrent(next);
        setSaving(true);
        try {
            await tagProject({ doc_type: docType, doc_id: docId, project_id: next || null });
            [...invalidate, "projects", "rpt-pl"].forEach((key) =>
                queryClient.invalidateQueries({ queryKey: [key] })
            );
        } catch {
            setCurrent(prev); // tagProject already showed the error
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <ProjectSelect
                includeClosed
                size="small"
                variant="borderless"
                placeholder="+ Project"
                value={current}
                onChange={handleChange}
                disabled={disabled || saving}
                loading={saving}
                style={{ width }}
                popupMatchSelectWidth={false}
            />
        </div>
    );
};

export default ProjectTagCell;
