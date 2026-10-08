import { useState, useMemo } from "react";
import { message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { eSignService } from "../services/esign.api";
import type {
    Document,
    PublicLinkInfo,
    ShareDocumentParams,
    SubmitSignaturePayload,
} from "../types/esign.types";

export const useSignatures = () => {
    const queryClient = useQueryClient();

    // Filters and view modes
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Public Link State
    const [linkInfo, setLinkInfo] = useState<PublicLinkInfo | null>(null);
    const [linkLoading, setLinkLoading] = useState(false);

    // Share State
    const [shareLoading, setShareLoading] = useState(false);

    // Fetch documents
    const {
        data: documentsData,
        isLoading: isDocumentsLoading,
        refetch: refetchDocuments,
    } = useQuery<{ data?: Document[] } | Document[]>({
        queryKey: ["documents"],
        queryFn: async () => {
            const response = await axiosInstance.get(`${BASE_URL}/documents`);
            return response.data;
        },
    });

    const allDocs: Document[] = useMemo(() => {
        if (!documentsData) return [];
        if (Array.isArray(documentsData)) return documentsData;
        if (Array.isArray(documentsData.data)) return documentsData.data;
        return [];
    }, [documentsData]);

    const filteredDocs = useMemo(() => {
        return allDocs.filter((doc) => {
            const matchesSearch = doc.name.toLowerCase().includes(searchText.toLowerCase());
            const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [allDocs, searchText, statusFilter]);

    const statCounts = useMemo(() => {
        return {
            total: allDocs.length,
            pending: allDocs.filter((d) =>
                ["pending_signature", "partially_signed"].includes(d.status)
            ).length,
            signed: allDocs.filter((d) => d.status === "signed").length,
            draft: allDocs.filter((d) => d.status === "draft").length,
        };
    }, [allDocs]);

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: (file: File) => eSignService.uploadDocument(file),
        onSuccess: () => {
            message.success("Document uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            message.error(error?.message || "Failed to upload document");
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (documentId: string) => eSignService.deleteDocument(documentId),
        onSuccess: () => {
            message.success("Document deleted");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            message.error(error?.message || "Failed to delete document");
        },
    });

    // Initiate workflow mutation
    const initiateMutation = useMutation({
        mutationFn: ({ documentId, data }: { documentId: string; data: Record<string, any> }) =>
            eSignService.initiateSigning(documentId, data),
        onSuccess: () => {
            message.success("Signing workflow initiated");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            message.error(error?.message || "Failed to initiate signing");
        },
    });

    // Submit signature mutation
    const submitSignatureMutation = useMutation({
        mutationFn: ({ documentId, data }: { documentId: string; data: SubmitSignaturePayload }) =>
            eSignService.submitSignature(documentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            message.error(error?.message || "Failed to submit signature");
        },
    });

    // Update signature position mutation
    const updatePositionMutation = useMutation({
        mutationFn: ({
            documentId,
            fieldId,
            position,
        }: {
            documentId: string;
            fieldId: string;
            position: { x: number; y: number; page: number; containerWidth?: number; containerHeight?: number };
        }) => eSignService.updateSignatureField(documentId, fieldId, { position }),
        onError: (error: any) => {
            message.error(error?.message || "Failed to update signature position");
        },
    });

    // Lock signature mutation
    const lockSignatureMutation = useMutation({
        mutationFn: ({
            documentId,
            fieldId,
            locked,
            position,
        }: {
            documentId: string;
            fieldId: string;
            locked: boolean;
            position: { x: number; y: number; page: number };
        }) => eSignService.updateSignatureField(documentId, fieldId, { locked, position }),
        onSuccess: () => {
            message.success("Signature lock status updated");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            message.error(error?.message || "Failed to update signature lock status");
        },
    });

    // Clear signature
    const clearSignature = async (documentId: string) => {
        try {
            await eSignService.clearSignature(documentId);
            message.success("Signature cleared");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        } catch (err: any) {
            message.error(err?.message || "Failed to clear signature");
        }
    };

    // Public Link operations
    const fetchPublicLink = async (documentId: string) => {
        setLinkLoading(true);
        setLinkInfo(null);
        try {
            const info = await eSignService.getPublicLink(documentId);
            setLinkInfo(info);
        } catch {
            setLinkInfo(null);
        } finally {
            setLinkLoading(false);
        }
    };

    const createPublicLink = async (documentId: string) => {
        setLinkLoading(true);
        try {
            const { token, expires_at } = await eSignService.createPublicLink(documentId);
            const url = eSignService.buildPublicSignUrl(token);
            setLinkInfo({
                active: true,
                token,
                expires_at,
                signed_at: null,
                signer_name: null,
                signer_email: null,
            });
            try {
                await navigator.clipboard.writeText(url);
                message.success("Signing link created and copied to clipboard");
            } catch {
                message.success("Signing link created");
            }
        } catch (error: any) {
            message.error(error?.response?.data?.error || "Failed to create signing link");
        } finally {
            setLinkLoading(false);
        }
    };

    const revokePublicLink = async (documentId: string) => {
        setLinkLoading(true);
        try {
            await eSignService.revokePublicLink(documentId);
            setLinkInfo((prev) => (prev ? { ...prev, active: false, token: null } : prev));
            message.success("Signing link revoked");
        } catch {
            message.error("Failed to revoke link");
        } finally {
            setLinkLoading(false);
        }
    };

    const copyPublicLink = async (token: string) => {
        try {
            await navigator.clipboard.writeText(eSignService.buildPublicSignUrl(token));
            message.success("Link copied to clipboard");
        } catch {
            message.error("Could not copy link to clipboard");
        }
    };

    // Share via Email
    const shareDocument = async (documentId: string, params: ShareDocumentParams) => {
        if (!params.emails || params.emails.length === 0) {
            message.warning("Add at least one recipient email");
            return false;
        }
        setShareLoading(true);
        try {
            await eSignService.shareDocument(documentId, params);
            message.success(
                `Shared with ${params.emails.length} recipient${params.emails.length > 1 ? "s" : ""}`
            );
            return true;
        } catch {
            message.error("Failed to share document");
            return false;
        } finally {
            setShareLoading(false);
        }
    };

    return {
        documents: allDocs,
        filteredDocs,
        statCounts,
        isLoading: isDocumentsLoading,
        refetchDocuments,
        searchText,
        setSearchText,
        statusFilter,
        setStatusFilter,
        viewMode,
        setViewMode,
        uploadMutation,
        deleteMutation,
        initiateMutation,
        submitSignatureMutation,
        updatePositionMutation,
        lockSignatureMutation,
        clearSignature,
        linkInfo,
        linkLoading,
        fetchPublicLink,
        createPublicLink,
        revokePublicLink,
        copyPublicLink,
        shareLoading,
        shareDocument,
    };
};
