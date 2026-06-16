import React, { useState, useEffect } from "react";
import { Modal, Checkbox, Button, Typography, Space, Divider, message } from "antd";
import { CarryOutOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getAllModifierAddons } from "@services/modifierAddons";

const { Text } = Typography;

interface AddonSelectionModalProps {
  open: boolean;
  onClose: () => void;
  product: any;
  onConfirm: (selectedAddons: string[]) => void;
}

interface ModifierAddonType {
  _id: string;
  name: string;
  addons: Array<{
    _id: string;
    name: string;
    price?: number;
  }>;
}

const AddonSelectionModal: React.FC<AddonSelectionModalProps> = ({
  open,
  onClose,
  product,
  onConfirm,
}) => {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<Set<string>>(new Set());

  const { data: allAddons, isLoading } = useQuery({
    queryKey: ["addons"],
    queryFn: getAllModifierAddons,
    retry: 3,
    networkMode: "always",
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setSelectedAddons([]);
      setSelectedModifiers(new Set());
    }
  }, [open]);

  const handleModifierToggle = (modifierId: string, modifier: ModifierAddonType) => {
    const newSelectedModifiers = new Set(selectedModifiers);
    
    if (newSelectedModifiers.has(modifierId)) {
      // Deselect modifier and all its addons
      newSelectedModifiers.delete(modifierId);
      setSelectedModifiers(newSelectedModifiers);
      
      // Remove all child addons from selectedAddons
      if (modifier.addons && modifier.addons.length > 0) {
        setSelectedAddons(prev => 
          prev.filter(id => !modifier.addons?.some((addon: any) => addon._id === id))
        );
      } else {
        // If modifier has no child addons, remove the modifier ID itself
        setSelectedAddons(prev => prev.filter(id => id !== modifierId));
      }
    } else {
      // Select modifier
      newSelectedModifiers.add(modifierId);
      setSelectedModifiers(newSelectedModifiers);
      
      // If modifier has child addons, select all of them
      if (modifier.addons && modifier.addons.length > 0) {
        const addonIds = modifier.addons?.map((addon: any) => addon._id) || [];
        setSelectedAddons(prev => [...new Set([...prev, ...addonIds])]);
      } else {
        // If modifier has no child addons, select the modifier ID itself
        setSelectedAddons(prev => [...new Set([...prev, modifierId])]);
      }
    }
  };

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => {
      if (prev.includes(addonId)) {
        return prev.filter(id => id !== addonId);
      } else {
        return [...prev, addonId];
      }
    });
  };

  const isAddonSelected = (addonId: string) => selectedAddons.includes(addonId);
  const isModifierSelected = (modifierId: string) => selectedModifiers.has(modifierId);

  const getSelectedAddonCount = (modifier: ModifierAddonType) => {
    // If modifier has child addons, count how many are selected
    if (modifier.addons && modifier.addons.length > 0) {
      return modifier.addons?.filter((addon: any) => selectedAddons.includes(addon._id)).length || 0;
    }
    // If modifier has no child addons, check if the modifier ID itself is selected
    return selectedAddons.includes(modifier._id) ? 1 : 0;
  };

  const handleConfirm = () => {
    if (selectedAddons.length === 0) {
      message.warning("Please select at least one addon");
      return;
    }
    onConfirm(selectedAddons);
    onClose();
  };

  // Show all modifiers and their addons (temporarily disable filtering for debugging)
  const productAddons = allAddons || [];

  // Debug: log to see what's happening
  console.log('Product addons:', product?.addons);
  console.log('All addons:', allAddons);
  console.log('Filtered productAddons:', productAddons);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <CarryOutOutlined />
          <span>Select Addons for {product?.name}</span>
        </Space>
      }
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          Add to Cart ({selectedAddons.length} selected)
        </Button>,
      ]}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading addons...</div>
      ) : productAddons.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Text type="secondary">No addons available for this product</Text>
        </div>
      ) : (
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {productAddons.map((modifier: ModifierAddonType) => (
            <div key={modifier._id} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <Checkbox
                  checked={isModifierSelected(modifier._id)}
                  onChange={() => handleModifierToggle(modifier._id, modifier)}
                  style={{ fontWeight: 600 }}
                >
                  {modifier.name}
                </Checkbox>
                <Text type="secondary" style={{ marginLeft: "8px" }}>
                  ({getSelectedAddonCount(modifier._id)}/{modifier.addons?.length || 0})
                </Text>
              </div>
              
              <div style={{ marginLeft: "24px" }}>
                {modifier.addons?.map((addon: any) => (
                  <div key={addon._id} style={{ marginBottom: "4px" }}>
                    <Checkbox
                      checked={isAddonSelected(addon._id)}
                      onChange={() => handleAddonToggle(addon._id)}
                    >
                      <Space size="small">
                        <Text>{addon.name}</Text>
                        {addon.price && (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            (+Ksh {addon.price})
                          </Text>
                        )}
                      </Space>
                    </Checkbox>
                  </div>
                ))}
              </div>
              
              <Divider style={{ margin: "12px 0" }} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default AddonSelectionModal;
