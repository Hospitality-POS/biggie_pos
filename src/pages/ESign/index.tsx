import React, { useState } from "react";
import { Typography, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import PermissionButton from "@components/PermissionButton";
import { useSignatures } from "./hooks/useSignatures";
import { eSignService } from "./services/esign.api";
import DocumentList from "./components/DocumentList";
import ESignModals from "./components/ESignModals";
import { UploadDocumentModal } from "./components/SigningWorkflowModals";
import type { Document } from "./types/esign.types";

const { Title, Text } = Typography;

const ESignContainer: React.FC = () => {
    const signatures = useSignatures();

    // Modal & Selection State
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [initiateDoc, setInitiateDoc] = useState<Document | null>(null);
    const [shareDocId, setShareDocId] = useState<string | null>(null);
    const [linkDocId, setLinkDocId] = useState<string | null>(null);

    const activeDoc = selectedDoc ? signatures.documents?.find((d) => d._id === selectedDoc._id) || selectedDoc : null;

    return (
        <div style={{ padding: "28px 36px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: -0.5 }}>E-Signature</Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>Upload, manage and sign documents electronically</Text>
                </div>
                <PermissionButton permission="SIGNATURE_CREATE">
                    <UploadDocumentModal
                        onSuccess={() => signatures.refetchDocuments()}
                        trigger={
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                size="large"
                                style={{ borderRadius: 8, height: 42, paddingInline: 20, fontWeight: 600 }}
                            >
                                Upload Document
                            </Button>
                        }
                    />
                </PermissionButton>
            </div>

            {/* Document List and Controls */}
            <DocumentList
                documents={signatures.filteredDocs}
                isLoading={signatures.isLoading}
                statCounts={signatures.statCounts}
                searchText={signatures.searchText}
                onSearchChange={signatures.setSearchText}
                statusFilter={signatures.statusFilter}
                onStatusFilterChange={signatures.setStatusFilter}
                viewMode={signatures.viewMode}
                onViewModeChange={signatures.setViewMode}
                onOpenSigning={(doc) => {
                    setSelectedDoc(doc);
                    setPreviewOpen(true);
                }}
                onInitiate={setInitiateDoc}
                onDownload={(id) => eSignService.downloadSignedDocument(id)}
                onShare={setShareDocId}
                onClearSignature={signatures.clearSignature}
                onOpenLinkModal={(id) => {
                    setLinkDocId(id);
                    signatures.fetchPublicLink(id);
                }}
                onDelete={(doc) => signatures.deleteMutation.mutate(doc._id)}
                onUploadSuccess={() => signatures.refetchDocuments()}
            />

            {/* Modals */}
            <ESignModals
                signatures={signatures}
                selectedDoc={activeDoc}
                previewOpen={previewOpen}
                onClosePreview={() => setPreviewOpen(false)}
                initiateDoc={initiateDoc}
                onCloseInitiate={() => setInitiateDoc(null)}
                shareDocId={shareDocId}
                setShareDocId={setShareDocId}
                onCloseShare={() => setShareDocId(null)}
                linkDocId={linkDocId}
                onCloseLink={() => setLinkDocId(null)}
            />
        </div>
    );
};

export default ESignContainer;
