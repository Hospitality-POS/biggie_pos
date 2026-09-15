import React, { useState } from "react";
import { message } from "antd";
import DocumentPreviewModal from "./DocumentPreviewModal";
import SignatureCaptureModal from "./SignatureCaptureModal";
import LibraryModal from "./LibraryModal";
import {
    InitiateSigningModal,
    ShareDocumentModal,
    PublicLinkModal,
} from "./SigningWorkflowModals";
import { eSignService } from "../services/esign.api";
import type { Document, PendingMarker, LibraryItem, SignatureField } from "../types/esign.types";
import type { useSignatures } from "../hooks/useSignatures";

export interface ESignModalsProps {
    signatures: ReturnType<typeof useSignatures>;
    selectedDoc: Document | null;
    previewOpen: boolean;
    onClosePreview: () => void;
    initiateDoc: Document | null;
    onCloseInitiate: () => void;
    shareDocId: string | null;
    setShareDocId: (id: string | null) => void;
    onCloseShare: () => void;
    linkDocId: string | null;
    onCloseLink: () => void;
}

export const ESignModals: React.FC<ESignModalsProps> = ({
    signatures,
    selectedDoc,
    previewOpen,
    onClosePreview,
    initiateDoc,
    onCloseInitiate,
    shareDocId,
    setShareDocId,
    onCloseShare,
    linkDocId,
    onCloseLink,
}) => {
    const [captureOpen, setCaptureOpen] = useState(false);
    const [captureTab, setCaptureTab] = useState<"signature" | "initials" | "stamp">("signature");
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [libraryType, setLibraryType] = useState<"signature" | "stamp">("signature");
    const [placingMode, setPlacingMode] = useState(false);
    const [placingItem, setPlacingItem] = useState<LibraryItem | null>(null);
    const [pendingMarkers, setPendingMarkers] = useState<PendingMarker[]>([]);

    const handleSignAllMarkers = async (markers: PendingMarker[]) => {
        if (!selectedDoc) return;
        try {
            for (const marker of markers) {
                const dims = marker.type === "stamp" ? { width: 110, height: 110 } : { width: 200, height: 50 };
                await signatures.submitSignatureMutation.mutateAsync({
                    documentId: selectedDoc._id,
                    data: {
                        signature_data: marker.preloadedData,
                        signature_type: marker.preloadedType || marker.type,
                        position: { x: marker.x, y: marker.y, page: marker.page, ...dims },
                    },
                });
            }
            message.success(`${markers.length} field${markers.length !== 1 ? "s" : ""} placed successfully`);
            setPendingMarkers([]);
            await signatures.refetchDocuments();
        } catch {
            message.error("Failed to place some fields");
        }
    };

    const handleSaveCapture = async (data: string, type: string) => {
        if (!selectedDoc) return;
        setCaptureOpen(false);
        const markersToSign: PendingMarker[] =
            pendingMarkers.length > 0
                ? pendingMarkers
                : [
                      {
                          id: `pm-${Date.now()}`,
                          x: 100,
                          y: 100,
                          page: 1,
                          type: type as any,
                          preloadedData: data,
                          preloadedType: type,
                      },
                  ];

        try {
            for (const marker of markersToSign) {
                const dims = marker.type === "stamp" ? { width: 110, height: 110 } : { width: 200, height: 50 };
                await signatures.submitSignatureMutation.mutateAsync({
                    documentId: selectedDoc._id,
                    data: {
                        signature_data: marker.preloadedData || data,
                        signature_type: marker.preloadedType || type,
                        position: { x: marker.x, y: marker.y, page: marker.page, ...dims },
                    },
                });
            }
            message.success(`${markersToSign.length} field${markersToSign.length !== 1 ? "s" : ""} signed successfully`);
            setPendingMarkers([]);
            await signatures.refetchDocuments();
        } catch {
            message.error("Failed to sign some fields");
        }
    };

    const handleDuplicateSignature = (field: SignatureField, totalPages: number) => {
        if (!selectedDoc) return;
        const pagesToAdd: number[] = [];
        for (let p = 1; p <= totalPages; p++) {
            if (p !== field.position.page) pagesToAdd.push(p);
        }
        if (pagesToAdd.length === 0) {
            message.info("No other pages to copy to");
            return;
        }

        pagesToAdd.forEach((page, index) => {
            setTimeout(async () => {
                try {
                    await signatures.submitSignatureMutation.mutateAsync({
                        documentId: selectedDoc._id,
                        data: {
                            source_signature_id: field._id,
                            signature_type: field.signature_type || "upload",
                            position: {
                                x: field.position.x,
                                y: field.position.y,
                                page,
                                width: field.position.width || 200,
                                height: field.position.height || 50,
                            },
                        },
                    });
                    if (index === pagesToAdd.length - 1) {
                        message.success(`Signature duplicated to ${pagesToAdd.length} page(s)`);
                        signatures.refetchDocuments();
                    }
                } catch {
                    // Handled
                }
            }, index * 200);
        });
    };

    return (
        <>
            <DocumentPreviewModal
                open={previewOpen}
                onClose={onClosePreview}
                document={selectedDoc}
                onOpenCapture={(mode) => {
                    setCaptureTab(mode);
                    setCaptureOpen(true);
                }}
                onOpenLibrary={(type) => {
                    setLibraryType(type);
                    setLibraryOpen(true);
                }}
                onSignAll={handleSignAllMarkers}
                isSigning={signatures.submitSignatureMutation.isLoading}
                onUpdatePosition={(p) => signatures.updatePositionMutation.mutate(p)}
                onLockToggle={(p) => signatures.lockSignatureMutation.mutate(p)}
                onDeleteSignature={(fieldId) => {
                    if (selectedDoc) {
                        eSignService.deleteSignatureField(selectedDoc._id, fieldId).catch(() => undefined);
                        message.success("Signature removed");
                        signatures.refetchDocuments();
                    }
                }}
                onDuplicateSignature={handleDuplicateSignature}
                onDownload={(docId) => eSignService.downloadSignedDocument(docId)}
                onShare={(docId) => {
                    setShareDocId(docId);
                }}
                placingMode={placingMode}
                placingItem={placingItem}
                onClearPlacingMode={() => {
                    setPlacingMode(false);
                    setPlacingItem(null);
                }}
                pendingMarkers={pendingMarkers}
                setPendingMarkers={setPendingMarkers}
            />

            <SignatureCaptureModal
                open={captureOpen}
                onClose={() => setCaptureOpen(false)}
                defaultTab={captureTab}
                showSaveToLibraryOption={true}
                onSave={handleSaveCapture}
            />

            <LibraryModal
                open={libraryOpen}
                onClose={() => setLibraryOpen(false)}
                type={libraryType}
                onSelect={(data, type) => {
                    setPendingMarkers((prev) => [
                        ...prev,
                        {
                            id: `pm-${Date.now()}`,
                            x: 100,
                            y: 100,
                            page: 1,
                            type: type as any,
                            preloadedData: data,
                            preloadedType: type,
                        },
                    ]);
                    message.success("Field placed — drag to reposition, then click Sign");
                    setLibraryOpen(false);
                }}
                onEnterPlacingMode={(item) => {
                    setPlacingItem(item);
                    setPlacingMode(true);
                    setLibraryOpen(false);
                }}
            />

            <InitiateSigningModal
                open={Boolean(initiateDoc)}
                onCancel={onCloseInitiate}
                document={initiateDoc}
                loading={signatures.initiateMutation.isLoading}
                onInitiate={async (data) => {
                    if (initiateDoc) {
                        await signatures.initiateMutation.mutateAsync({
                            documentId: initiateDoc._id,
                            data,
                        });
                        onCloseInitiate();
                    }
                }}
            />

            <ShareDocumentModal
                open={Boolean(shareDocId)}
                onCancel={onCloseShare}
                documentId={shareDocId}
                loading={signatures.shareLoading}
                onShare={signatures.shareDocument}
            />

            <PublicLinkModal
                open={Boolean(linkDocId)}
                onClose={onCloseLink}
                linkInfo={signatures.linkInfo}
                linkLoading={signatures.linkLoading}
                onCreateLink={() => linkDocId && signatures.createPublicLink(linkDocId)}
                onRevokeLink={() => linkDocId && signatures.revokePublicLink(linkDocId)}
                onCopyLink={signatures.copyPublicLink}
            />
        </>
    );
};

export default ESignModals;
