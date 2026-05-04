import { fetchAllUsersList } from '@services/users';
import { createProperty, updateProperty } from '@services/dala';
import { fetchPropertyTypes } from '@services/dala';
import { PlusOutlined, HolderOutlined, EditOutlined, DeleteOutlined, TagOutlined, HomeOutlined, BuildOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { ModalForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormText, ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { message, Row, Col, Form, Button, Input, Space, Tag, Popconfirm, Table, Tabs, Divider, Switch, InputNumber, Modal, Checkbox, Radio, Steps, Select } from 'antd';
import moment from 'moment';
import React, { useEffect, useState } from 'react'

interface AddEditPropertyModalProps {
  edit?: boolean;
  actionRef?: any;
  data?: any;
  quickMode?: boolean;
}

interface Floor {
  _id?: string;
  key?: string;
  tempId?: string;
  blockTempId?: string;
  name: string;
  floorNumber: number;
  status?: string;
}

interface Block {
  _id?: string;
  key?: string;
  tempId?: string;
  name: string;
  description?: string;
  totalFloors: number;
  status?: string;
  floors: Floor[];
}

interface Apartment {
  key?: string;
  _id?: string;
  apartmentName: string;
  status: 'available' | 'sold' | 'reserved';
  soldTo?: string;
  soldDate?: string;
  customerId?: string;
}

interface PhasePricing {
  phaseName: string;
  price: number;
  active: boolean;
  _id?: string;
  phaseId?: string;
  startDate: string;
}

interface Unit {
  _id?: string;
  key?: string;
  unitType: string;
  unitNumber?: string;
  basePrice: number;
  price?: number;
  priceStartPoint: number;
  phasePricing: PhasePricing[];
  status: string;
  totalUnits: number;
  availableUnits: number;
  blockId?: string;
  floorId?: string;
  plotSize?: string;
  trackIndividualUnits?: boolean;
  apartments?: Apartment[];
}

interface Phase {
  name: string;
  startDate: any;
  endDate: any;
  active: boolean;
  _id?: string;
  key?: string;
  order: number;
}

// ✅ Normalize property type slug to lowercase AND map plural/variant slugs
//    to the canonical singular form used in comparisons throughout the component.
//    e.g. "apartments" → "apartment", "lands" → "land", "Apartment" → "apartment"
const PROPERTY_TYPE_ALIASES: Record<string, string> = {
  apartments: 'apartment',
  lands: 'land',
  plots: 'land',
  plot: 'land',
  studios: 'apartment',  // studio units use the same block/floor form as apartments
  studio: 'apartment',
};

const normalizePropertyType = (value: string): string => {
  const lower = (value || '').toLowerCase().trim();
  return PROPERTY_TYPE_ALIASES[lower] ?? lower;
};

// Helper function to format undefined values with user-friendly messages
const formatFieldValue = (value: any, fieldName: string): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return String(value);
};

// Helper function to get placeholder text for undefined fields
const getFieldPlaceholder = (fieldName: string): string => {
  const placeholders: Record<string, string> = {
    address: 'Enter street address or area',
    county: 'Enter county name', 
    constituency: 'Enter constituency (optional)',
    name: 'Enter property name',
    propertyManager: 'Select property manager'
  };
  return placeholders[fieldName] || `Enter ${fieldName}`;
};

const AddEditPropertyModal: React.FC<AddEditPropertyModalProps> = ({ edit, actionRef, data, quickMode }) => {

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchAllUsersList({}),
  });

  // Get current shop_id from localStorage
  const currentShopId = localStorage.getItem('shopId');
  // Filter users by current shop and property manager role
  const propertyManagers = allUsers?.filter((user: any) => 
    user.shop_id?._id === currentShopId
  ) || [];

  // ✅ Fetch property types from dedicated propertyType service
  const { data: propertyTypesResponse, isLoading: isLoadingPropertyTypes } = useQuery({
    queryKey: ['property-types'],
    queryFn: () => fetchPropertyTypes({ status: 'active', limit: 100 }),
  });

  // ✅ API returns { success, count, data: [...], pagination }
  //    response.data is already unwrapped by axios, so shape is { data: [...] }
  const propertyTypesList: any[] =
    propertyTypesResponse?.data ||          // { data: [...] }.data  ← actual shape
    propertyTypesResponse?.data?.data ||    // nested fallback
    (Array.isArray(propertyTypesResponse) ? propertyTypesResponse : []);

  // Normalize option values to lowercase slugs for reliable comparison
  const propertyTypeOptions = propertyTypesList.map((pt: any) => ({
    label: pt.name,
    value: normalizePropertyType(pt.slug || pt._id),
  }));

  const [phases, setPhases] = useState<Phase[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [phasesValidationError, setPhasesValidationError] = useState<boolean>(false);
  const [blocksValidationError, setBlocksValidationError] = useState<boolean>(false);
  const [unitsValidationError, setUnitsValidationError] = useState<boolean>(false);

  // Always store propertyType as normalized lowercase
  const [propertyType, setPropertyType] = useState<string>(
    edit && data ? normalizePropertyType(data.propertyType) : ''
  );

  // Property purpose: sale, lease, or rent
  const [propertyPurpose, setPropertyPurpose] = useState<string>(
    edit && data ? data.propertyPurpose || 'sale' : 'sale'
  );

  // Current phase state
  const [currentPhase, setCurrentPhase] = useState<string>('');
  
  // Derive current phase from phases array (must be declared before functions that use it)
  const derivedCurrentPhase = phases.find(phase => phase.active)?.name || '';

  const [blockForm, setBlockForm] = useState({
    name: '',
    totalFloors: 1,
    description: ''
  });

  const [unitForm, setUnitForm] = useState({
    blockId: '',
    floorId: '',
    unitNumber: '',
    unitType: 'one_bedroom',
    priceStartPoint: 0,
    totalUnits: 1,
    trackIndividualUnits: false
  });

  const [apartmentModalVisible, setApartmentModalVisible] = useState(false);
  const [apartmentNames, setApartmentNames] = useState<Apartment[]>([]);
  const [tempUnitData, setTempUnitData] = useState<any>(null);
  const [namingPattern, setNamingPattern] = useState<'sequential' | 'letters' | 'custom'>('sequential');
  const [viewApartmentsModalVisible, setViewApartmentsModalVisible] = useState(false);
  const [selectedUnitForView, setSelectedUnitForView] = useState<Unit | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [undefinedFields, setUndefinedFields] = useState<any[]>([]);

  const [formRef] = Form.useForm();

  // ✅ Count existing apartments of the same unit type across ALL blocks
  const generateApartmentNames = (
    baseUnitNumber: string,
    totalUnits: number,
    pattern: 'sequential' | 'letters' | 'custom',
    unitType: string
  ): Apartment[] => {
    const existingCount = units
      .filter(u => u.unitType === unitType && u.trackIndividualUnits && u.apartments)
      .reduce((total, u) => total + (u.apartments?.length || 0), 0);

    const apartments: Apartment[] = [];

    for (let i = 0; i < totalUnits; i++) {
      const globalIndex = existingCount + i;
      let apartmentName = '';

      switch (pattern) {
        case 'sequential':
          apartmentName = `${baseUnitNumber}-${globalIndex + 1}`;
          break;
        case 'letters':
          const letterIndex = globalIndex % 26;
          const letterPrefix = globalIndex >= 26 ? String.fromCharCode(65 + Math.floor(globalIndex / 26) - 1) : '';
          apartmentName = `${baseUnitNumber}-${letterPrefix}${String.fromCharCode(65 + letterIndex)}`;
          break;
        case 'custom':
          apartmentName = `${baseUnitNumber}-${globalIndex + 1}`;
          break;
      }

      apartments.push({
        key: `apt-${Date.now()}-${i}`,
        apartmentName,
        status: 'available'
      });
    }

    return apartments;
  };

  const handleApartmentNameChange = (index: number, value: string) => {
    const updated = [...apartmentNames];
    updated[index].apartmentName = value;
    setApartmentNames(updated);
  };

  const saveApartmentNamesAndAddUnit = () => {
    if (!tempUnitData) return;
    const names = apartmentNames.map(apt => apt.apartmentName);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      message.error('Apartment names must be unique');
      return;
    }
    if (names.some(name => !name.trim())) {
      message.error('All apartment names must be filled');
      return;
    }
    const newUnit: Unit = { ...tempUnitData, apartments: apartmentNames, trackIndividualUnits: true };
    setUnits([...units, newUnit]);
    setApartmentModalVisible(false);
    setApartmentNames([]);
    setTempUnitData(null);
    setUnitForm({
      blockId: unitForm.blockId,
      floorId: unitForm.floorId,
      unitNumber: '',
      unitType: 'one_bedroom',
      priceStartPoint: unitForm.priceStartPoint,
      totalUnits: 1,
      trackIndividualUnits: false
    });
    message.success('Unit with individual apartments added successfully');
    setUnitsValidationError(false);
  };

  const skipApartmentNamingAndAddUnit = () => {
    if (!tempUnitData) return;
    const newUnit: Unit = { ...tempUnitData, trackIndividualUnits: false, apartments: undefined };
    setUnits([...units, newUnit]);
    setApartmentModalVisible(false);
    setApartmentNames([]);
    setTempUnitData(null);
    setUnitForm({
      blockId: unitForm.blockId,
      floorId: unitForm.floorId,
      unitNumber: '',
      unitType: 'one_bedroom',
      priceStartPoint: unitForm.priceStartPoint,
      totalUnits: 1,
      trackIndividualUnits: false
    });
    message.success('Unit added successfully');
    setUnitsValidationError(false);
  };

  useEffect(() => {
    if (edit && data) {
      const propertyPhases = data.phases || [];
      const propertyUnits = data.propertyUnits || data.units || [];
      const propertyBlocks = data.blocks || [];

      // Set form field values from API data with better undefined handling
      const formData: any = {
        name: formatFieldValue(data.name, 'name'),
        propertyType: normalizePropertyType(data.propertyType || ''),
        propertyPurpose: data.purpose || data.propertyPurpose || 'sale',
        status: data.status || 'available',
        // Map location object to form fields
        address: formatFieldValue(data.location?.description || data.location?.name, 'address'),
        county: formatFieldValue(data.location?.name, 'county'),
        constituency: formatFieldValue(data.location?.constituency, 'constituency'),
        // Map property manager to expected format
        propertyManager: data.propertyManager?._id || data.propertyManager || '',
      };

      // Check for undefined critical fields and prepare user-friendly messages
      const undefinedFields = [];
      if (!data.location?.description && !data.location?.name) {
        undefinedFields.push({ field: 'address', message: 'Location information not defined', icon: '📍', action: 'Provide address details' });
      }
      if (!data.location?.name) {
        undefinedFields.push({ field: 'county', message: 'County information not defined', icon: '🏛️', action: 'Specify the county' });
      }
      if (!data.propertyManager?._id && !data.propertyManager) {
        undefinedFields.push({ field: 'propertyManager', message: 'Property manager not assigned', icon: '👤', action: 'Select a property manager' });
      }

      // Store undefined fields for display in form
      setUndefinedFields(undefinedFields);

      // Show user-friendly messages for undefined fields
      if (undefinedFields.length > 0) {
        const messages = undefinedFields.map(f => `${f.icon} ${f.message}. ${f.action}.`).join(' ');
        console.info(`📝 Property Information: ${messages}`);
      }

      formRef.setFieldsValue(formData);

      if (propertyPhases.length > 0) {
        setPhases(propertyPhases.map((phase: any, index: number) => ({
          ...phase,
          key: phase._id || `phase_${index}`,
          startDate: phase.startDate ? moment(phase.startDate) : moment(),
          endDate: phase.endDate ? moment(phase.endDate) : moment(),
          order: index
        })));
      }

      if (propertyBlocks.length > 0) {
        const loadedBlocks = propertyBlocks.map((block: any, index: number) => ({
          ...block,
          key: block._id || `block_${index}`,
          tempId: block._id || `temp-block-${index}`,
          floors: (block.floors || []).map((floor: any, fIndex: number) => ({
            ...floor,
            key: floor._id || `floor_${index}_${fIndex}`,
            tempId: floor._id || `temp-floor-${index}_${fIndex}`,
            blockTempId: block._id || `temp-block-${index}` 
          }))
        }));
        setBlocks(loadedBlocks);
        setFloors(loadedBlocks.flatMap((block: any) => block.floors));
      }

      if (propertyUnits.length > 0) {
        setUnits(propertyUnits.map((unit: any, index: number) => ({
          ...unit,
          key: unit._id || `unit_${index}`,
          phasePricing: unit.phasePricing?.map((pricing: any, pIndex: number) => ({
            ...pricing,
            phaseId: pricing.phaseId || pricing._id,
            key: pricing._id || `pricing_${index}_${pIndex}` 
          })) || [],
          apartments: unit.apartments || undefined
        })));
      }

      // Set current phase properly - handle object or string data.currentPhase
      if (data.currentPhase) {
        // Handle if data.currentPhase is an object with name property
        const currentPhaseName = typeof data.currentPhase === 'object' ? data.currentPhase.name : data.currentPhase;
        setCurrentPhase(currentPhaseName);
      } else {
        setCurrentPhase('');
      }
      // ✅ Normalize when loading from edit data
      setPropertyType(normalizePropertyType(data.propertyType || ''));
      // ✅ Set property purpose from API data
      setPropertyPurpose(data.purpose || data.propertyPurpose || 'sale');
    }
  }, [edit, data, formRef]);

  const handleAddBlock = () => {
    if (!blockForm.name || !blockForm.totalFloors) {
      message.error('Please enter block name and total floors');
      return;
    }
    if (blockForm.totalFloors > 20) {
      message.error('Maximum 20 floors allowed per block');
      return;
    }
    if (blocks.some(block => block.name === blockForm.name)) {
      message.error('A block with this name already exists');
      return;
    }

    const newBlock: Block = {
      key: `block-${Date.now()}`,
      tempId: `temp-block-${Date.now()}`,
      name: blockForm.name,
      description: blockForm.description,
      totalFloors: blockForm.totalFloors,
      status: 'active',
      floors: []
    };

    for (let i = 0; i < blockForm.totalFloors; i++) {
      let floorName = '';
      if (i === 0) floorName = 'Ground Floor';
      else if (i === 1) floorName = '1st Floor';
      else if (i === 2) floorName = '2nd Floor';
      else if (i === 3) floorName = '3rd Floor';
      else floorName = `${i}th Floor`;

      newBlock.floors.push({
        key: `floor-${Date.now()}-${i}`,
        tempId: `temp-floor-${Date.now()}-${i}`,
        blockTempId: newBlock.tempId,
        name: floorName,
        floorNumber: i,
        status: 'active'
      });
    }

    const updatedBlocks = [...blocks, newBlock];
    setBlocks(updatedBlocks);
    setFloors(updatedBlocks.flatMap(block => block.floors));
    message.success(`Block "${blockForm.name}" added with ${blockForm.totalFloors} floors`);
    setBlockForm({ name: '', totalFloors: 1, description: '' });
    setBlocksValidationError(false);
  };

  const removeBlock = (key: string) => {
    const blockToRemove = blocks.find(b => b.key === key);
    const updatedBlocks = blocks.filter(block => block.key !== key);
    setBlocks(updatedBlocks);
    setFloors(updatedBlocks.flatMap(block => block.floors));
    if (blockToRemove) {
      setUnits(units.filter(unit => unit.blockId !== blockToRemove.tempId));
    }
    message.success('Block removed successfully');
  };

  const handleAddPhase = () => {
    const phaseName = formRef.getFieldValue('phaseName');
    const startDate = formRef.getFieldValue('startDate');
    const phaseEndDate = formRef.getFieldValue('phaseEndDate');
    const phaseActive = formRef.getFieldValue('phaseActive') || false;

    if (!phaseName) { message.error('Please enter phase name'); return; }
    if (!startDate) { message.error('Please select start date'); return; }
    if (!phaseEndDate) { message.error('Please select end date'); return; }
    if (phases.some(phase => phase.name === phaseName)) {
      message.error('Phase with this name already exists');
      return;
    }

    // ✅ First phase is always active by default; subsequent phases
    //    only become active if the user explicitly toggles the switch
    const isFirstPhase = phases.length === 0;
    const newPhase: Phase = {
      name: phaseName,
      startDate,
      endDate: phaseEndDate,
      active: isFirstPhase ? true : phaseActive,
      key: `phase_${Date.now()}`,
      order: phases.length
    };

    setPhases([...phases, newPhase]);
    if (isFirstPhase || phaseActive) setCurrentPhase(phaseName);

    setUnits(units.map(unit => ({
      ...unit,
      phasePricing: [
        ...(unit.phasePricing || []),
        {
          phaseName,
          price: unit.priceStartPoint || 0,
          active: isFirstPhase ? true : phaseActive,
          startDate: startDate.toISOString(),
          key: `pricing_${Date.now()}_${unit.key}` 
        }
      ]
    })));

    formRef.setFieldsValue({ phaseName: '', startDate: null, phaseEndDate: null, phaseActive: false });
    message.success('Phase added successfully');
    setPhasesValidationError(false);
  };

  const handleAddUnit = () => {
    if (propertyType === 'apartment') {
      if (!unitForm.blockId || !unitForm.floorId) { message.error('Please select block and floor'); return; }
      if (!unitForm.unitType) { message.error('Please select unit type'); return; }
      if (!unitForm.priceStartPoint) { message.error('Please enter price start point'); return; }

      if (unitForm.unitNumber) {
        const existingUnit = units.find(u => u.floorId === unitForm.floorId && u.unitNumber === unitForm.unitNumber);
        if (existingUnit) { message.error('A unit with this number already exists on this floor'); return; }
      }

      // For lease/rent, don't require phases
      const requiresPhases = propertyPurpose === 'sale';
      if (requiresPhases && phases.length === 0) {
        message.error('Please add at least one pricing phase before adding units');
        return;
      }

      const unitData = {
        key: `unit_${Date.now()}`,
        unitType: unitForm.unitType,
        unitNumber: unitForm.unitNumber,
        blockId: unitForm.blockId,
        floorId: unitForm.floorId,
        basePrice: unitForm.priceStartPoint,
        priceStartPoint: unitForm.priceStartPoint,
        totalUnits: unitForm.totalUnits,
        availableUnits: unitForm.totalUnits,
        status: 'available',
        phasePricing: requiresPhases ? phases.map(phase => ({
          phaseName,
          price: unitForm.priceStartPoint,
          active: phase.active,
          startDate: phase.startDate.toISOString(),
          key: `pricing_${Date.now()}_${phase.key}` 
        })) : []
      };

      if (unitForm.trackIndividualUnits && unitForm.totalUnits > 1) {
        setTempUnitData(unitData);
        setApartmentNames(generateApartmentNames(
          unitForm.unitNumber || 'Unit',
          unitForm.totalUnits,
          namingPattern,
          unitForm.unitType
        ));
        setApartmentModalVisible(true);
      } else {
        setUnits([...units, { ...unitData, trackIndividualUnits: false }]);
        setUnitForm({
          blockId: unitForm.blockId,
          floorId: unitForm.floorId,
          unitNumber: '',
          unitType: 'one_bedroom',
          priceStartPoint: unitForm.priceStartPoint,
          totalUnits: 1,
          trackIndividualUnits: false
        });
        message.success('Unit added successfully');
        setUnitsValidationError(false);
      }
    } else {
      const plotSize = formRef.getFieldValue('plotSize');
      const priceStartPoint = formRef.getFieldValue('priceStartPoint');
      const totalUnits = formRef.getFieldValue('totalUnits') || 1;

      if (!plotSize) { message.error('Please select plot size'); return; }
      if (!priceStartPoint) { message.error('Please enter price start point'); return; }
      if (units.some(u => u.unitType === plotSize)) { message.error('This plot size already exists'); return; }

      // For lease/rent, don't require phases
      const requiresPhases = propertyPurpose === 'sale';
      if (requiresPhases && phases.length === 0) {
        message.error('Please add at least one pricing phase before adding units');
        return;
      }

      const newUnit: Unit = {
        key: `unit_${Date.now()}`,
        unitType: plotSize,
        plotSize,
        basePrice: priceStartPoint,
        priceStartPoint,
        totalUnits,
        availableUnits: totalUnits,
        status: 'available',
        phasePricing: requiresPhases ? phases.map(phase => ({
          phaseName: phase.name,
          price: priceStartPoint,
          active: phase.active,
          startDate: phase.startDate.toISOString(),
          key: `pricing_${Date.now()}_${phase.key}` 
        })) : []
      };

      setUnits([...units, newUnit]);
      formRef.setFieldsValue({ plotSize: undefined, priceStartPoint: 0, totalUnits: 1 });
      message.success('Plot added successfully');
      setUnitsValidationError(false);
    }
  };

  const deletePhase = (key: string) => {
    const phaseToDelete = phases.find(p => p.key === key);
    if (phaseToDelete && phaseToDelete.name === currentPhase && phases.length > 1) {
      message.error('Cannot delete the current active phase. Please set another phase as active first.');
      return;
    }
    setPhases(phases.filter(p => p.key !== key));
    if (phaseToDelete) {
      setUnits(units.map(unit => ({
        ...unit,
        phasePricing: (unit.phasePricing || []).filter(p => p.phaseName !== phaseToDelete.name)
      })));
    }
    message.success('Phase deleted successfully');
  };

  const setActivePhase = (key: string) => {
    const phase = phases.find(p => p.key === key);
    if (phase) {
      setCurrentPhase(phase.name);
      message.success(`${phase.name} set as active phase`);
    }
  };

  const removeUnit = (key: string) => {
    setUnits(units.filter(u => u.key !== key));
    message.success('Unit removed successfully');
  };

  const viewApartments = (unit: Unit) => {
    setSelectedUnitForView(unit);
    setViewApartmentsModalVisible(true);
  };

  const updateUnitPhasePrice = (unitKey: string, phaseName: string, price: number) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.key === unitKey || unit._id === unitKey) {
        return {
          ...unit,
          phasePricing: (unit.phasePricing || []).map(pricing =>
            pricing.phaseName === phaseName ? { ...pricing, price: Number(price) } : pricing
          ),
          price: unit.phasePricing?.[0]?.phaseName === phaseName ? Number(price) : unit.price,
        };
      }
      return unit;
    }));
  };

  const validateBeforeSubmit = () => {
    const resolvedType = normalizePropertyType(formRef.getFieldValue('propertyType') || propertyType);
    
    // Only require phases for sale properties
    if (propertyPurpose === 'sale' && phases.length === 0) { 
      setPhasesValidationError(true); 
      message.error('Please add at least one pricing phase'); 
      return false; 
    }
    
    if (resolvedType === 'apartment' && blocks.length === 0) { 
      setBlocksValidationError(true); 
      message.error('Please add at least one block for apartment property'); 
      return false; 
    }
    
    if (units.length === 0) { 
      setUnitsValidationError(true); 
      message.error(`Please add at least one ${resolvedType === 'land' ? 'plot' : 'unit'}`); 
      return false; 
    }
    
    return true;
  };

  const getUnitLabel = (unit: Unit) => {
    if (propertyType === 'land') return unit.plotSize || unit.unitType;
    const block = blocks.find(b => b.tempId === unit.blockId);
    const floor = floors.find(f => f.tempId === unit.floorId);
    return [block?.name, floor?.name, unit.unitNumber, unit.unitType.replace('_', ' ')].filter(Boolean).join(' - ');
  };

  const renderBlockManagement = () => {
    if (propertyType !== 'apartment') return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <Divider orientation="left"><Space><BuildOutlined />Block Management</Space></Divider>
        <div style={{ marginBottom: 16, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8 }}>
          <h4>Add New Block (Max 20 Floors per Block)</h4>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 16 }}>
                <label>Block Name <span style={{ color: 'red' }}>*</span></label>
                <Input
                  placeholder="e.g., Block A, Block B, Tower 1"
                  value={blockForm.name}
                  onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                />
              </div>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 16 }}>
                <label>Total Floors (1-20) <span style={{ color: 'red' }}>*</span></label>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1} max={20}
                  value={blockForm.totalFloors}
                  onChange={(value) => setBlockForm({ ...blockForm, totalFloors: value || 1 })}
                  placeholder="Enter number of floors"
                />
                <small style={{ color: '#888' }}>Ground floor + {blockForm.totalFloors - 1} upper floors</small>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 16 }}>
                <label>Description (Optional)</label>
                <Input
                  placeholder="e.g., East Wing, Main Building"
                  value={blockForm.description}
                  onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                />
              </div>
            </Col>
          </Row>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBlock}>Add Block</Button>
        </div>

        {blocksValidationError && (
          <div style={{ color: '#ff4d4f', marginBottom: 16, padding: '8px 12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
            ⚠️ Please add at least one block for apartment property
          </div>
        )}

        {blocks.length > 0 && (
          <>
            <h4>Added Blocks ({blocks.length})</h4>
            <Table
              columns={[
                { title: 'Block Name', dataIndex: 'name', key: 'name', render: (text: string) => <strong>{text}</strong> },
                { title: 'Total Floors', dataIndex: 'totalFloors', key: 'totalFloors', render: (f: number) => `${f} floors (Ground + ${f - 1})` },
                { title: 'Description', dataIndex: 'description', key: 'description', render: (text: string) => text || <span style={{ color: '#999' }}>No description</span> },
                {
                  title: 'Units', key: 'units',
                  render: (_: any, record: Block) => <Tag color="blue">{units.filter(u => u.blockId === record.tempId).length} units</Tag>
                },
                {
                  title: 'Actions', key: 'actions',
                  render: (_: any, record: Block) => (
                    <Popconfirm
                      title={units.filter(u => u.blockId === record.tempId).length > 0 ? 'This block has units. Delete anyway?' : 'Are you sure?'}
                      onConfirm={() => removeBlock(record.key!)}
                      okText="Yes" cancelText="No"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )
                }
              ]}
              dataSource={blocks}
              pagination={false}
              size="small"
              rowKey="key"
            />
          </>
        )}
      </div>
    );
  };

  const renderApartmentUnitForm = () => {
    const selectedBlock = blocks.find(b => b.tempId === unitForm.blockId);
    const availableFloors = floors.filter(floor => floor.blockTempId === unitForm.blockId);

    const getPriceLabel = () => {
      switch (propertyPurpose) {
        case 'lease': return 'Lease Rate (KES/month)';
        case 'rent': return 'Rent (KES/month)';
        default: return 'Price Start Point (KES)';
      }
    };

    const getPricePlaceholder = () => {
      switch (propertyPurpose) {
        case 'lease': return 'e.g., 50000';
        case 'rent': return 'e.g., 45000';
        default: return 'e.g., 5000000';
      }
    };

    return (
      <div style={{ marginBottom: 16, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8, background: '#fafafa' }}>
        <h4>Add Apartment Unit</h4>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ marginBottom: 16 }}>
              <label>Block <span style={{ color: 'red' }}>*</span></label>
              <ProFormSelect
                name="unitBlockId"
                options={blocks.map(block => ({ label: `${block.name} (${block.totalFloors} floors)`, value: block.tempId }))}
                fieldProps={{
                  value: unitForm.blockId,
                  onChange: (value) => setUnitForm({ ...unitForm, blockId: value, floorId: '' }),
                  placeholder: 'Select block'
                }}
              />
            </div>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 16 }}>
              <label>Floor <span style={{ color: 'red' }}>*</span></label>
              <ProFormSelect
                name="unitFloorId"
                options={availableFloors.map(floor => ({ label: floor.name, value: floor.tempId }))}
                fieldProps={{
                  value: unitForm.floorId,
                  onChange: (value) => setUnitForm({ ...unitForm, floorId: value }),
                  disabled: !unitForm.blockId,
                  placeholder: unitForm.blockId ? 'Select floor' : 'Select block first'
                }}
              />
              {selectedBlock && <small style={{ color: '#888' }}>{selectedBlock.totalFloors} floors available</small>}
            </div>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 16 }}>
              <label>Unit Number</label>
              <Input
                placeholder="e.g., 101, A1, BA111"
                value={unitForm.unitNumber}
                onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
              />
            </div>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 16 }}>
              <label>Unit Type <span style={{ color: 'red' }}>*</span></label>
              <ProFormSelect
                name="unitType"
                options={[
                  { label: 'Studio', value: 'studio' },
                  { label: 'One Bedroom', value: 'one_bedroom' },
                  { label: 'Two Bedroom', value: 'two_bedroom' },
                  { label: 'Three Bedroom', value: 'three_bedroom' },
                  { label: 'Penthouse', value: 'penthouse' },
                  { label: 'Shop', value: 'shop' },
                  { label: 'Other', value: 'other' },
                ]}
                fieldProps={{
                  value: unitForm.unitType,
                  onChange: (value) => setUnitForm({ ...unitForm, unitType: value })
                }}
              />
            </div>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <label>{getPriceLabel()} <span style={{ color: 'red' }}>*</span></label>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={unitForm.priceStartPoint}
                onChange={(value) => setUnitForm({ ...unitForm, priceStartPoint: value || 0 })}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                placeholder={getPricePlaceholder()}
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <label>Total Units <span style={{ color: 'red' }}>*</span></label>
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                value={unitForm.totalUnits}
                onChange={(value) => setUnitForm({ ...unitForm, totalUnits: value || 1 })}
                placeholder="Number of units"
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <Checkbox
                checked={unitForm.trackIndividualUnits}
                onChange={(e) => setUnitForm({ ...unitForm, trackIndividualUnits: e.target.checked })}
                style={{ marginTop: 30 }}
              >
                Track Individual Apartments
              </Checkbox>
              <small style={{ color: '#888', display: 'block', marginTop: 4 }}>
                {unitForm.trackIndividualUnits
                  ? 'You can name each apartment individually'
                  : 'Units will be tracked as a group'
                }
              </small>
            </div>
          </Col>
        </Row>
        {propertyPurpose !== 'sale' && (
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <label>Lease/Rent Term</label>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select lease term"
                  options={[
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Quarterly', value: 'quarterly' },
                    { label: 'Semi-Annually', value: 'semi_annually' },
                    { label: 'Annually', value: 'annually' },
                  ]}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <label>Security Deposit (KES)</label>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="e.g., 50000"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </div>
            </Col>
          </Row>
        )}
        <Row gutter={16}>
          <Col span={24}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddUnit}
              disabled={!unitForm.blockId || !unitForm.floorId || (propertyPurpose === 'sale' && phases.length === 0)}
              style={{ width: '100%', height: 40 }}
            >
              Add This Unit
            </Button>
          </Col>
        </Row>
        {propertyPurpose === 'sale' && phases.length === 0 && (
          <div style={{ padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, marginTop: 8 }}>
            ℹ️ Add at least one pricing phase before adding units
          </div>
        )}
      </div>
    );
  };

  const renderLandUnitForm = () => {
    const getPriceLabel = () => {
      switch (propertyPurpose) {
        case 'lease': return 'Lease Rate (KES/month)';
        case 'rent': return 'Rent (KES/month)';
        default: return 'Price Start Point (KES)';
      }
    };

    const getPricePlaceholder = () => {
      switch (propertyPurpose) {
        case 'lease': return 'e.g., 15000';
        case 'rent': return 'e.g., 12000';
        default: return 'e.g., 500000';
      }
    };

    return (
      <div style={{ marginBottom: 16, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8 }}>
        <h4>Add Land Plot</h4>
        <Row gutter={16}>
          <Col span={8}>
            <ProFormSelect
              name="plotSize"
              label="Plot Size"
              options={[
                { label: '50/100 (1/8 Acre)', value: '50/100' },
                { label: '80/100', value: '80/100' },
                { label: '100/100 (1/4 Acre Full)', value: '100/100' },
                { label: '40/100 (1/10 Acre)', value: '40/100' },
                { label: '60/100', value: '60/100' },
                { label: '20/100', value: '20/100' },
                { label: '25/100', value: '25/100' },
                { label: '75/100', value: '75/100' },
              ]}
            />
          </Col>
          <Col span={8}>
            <ProFormDigit
              name="priceStartPoint"
              label={getPriceLabel()}
              min={0}
              fieldProps={{
                placeholder: getPricePlaceholder(),
                formatter: (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                parser: (value) => value!.replace(/\$\s?|(,*)/g, ''),
              }}
            />
          </Col>
          <Col span={8}>
            <ProFormDigit name="totalUnits" label="Number of Plots" min={1} initialValue={1} />
          </Col>
        </Row>
        {propertyPurpose !== 'sale' && (
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <label>Lease/Rent Term</label>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select lease term"
                  options={[
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Quarterly', value: 'quarterly' },
                    { label: 'Semi-Annually', value: 'semi_annually' },
                    { label: 'Annually', value: 'annually' },
                  ]}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <label>Security Deposit (KES)</label>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="e.g., 30000"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </div>
            </Col>
          </Row>
        )}
        <Col span={24} style={{ marginTop: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUnit} disabled={propertyPurpose === 'sale' && phases.length === 0}>
            Add This Plot Type
          </Button>
          {propertyPurpose === 'sale' && phases.length === 0 && <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>Add at least one phase first</span>}
        </Col>
      </div>
    );
  };

  const renderPhaseForm = () => (
    <div style={{ marginBottom: 16, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8 }}>
      <h4>Add New Pricing Phase</h4>
      <Row gutter={16}>
        <Col span={8}>
          <ProFormText name="phaseName" label="Phase Name" placeholder="e.g., Early Bird, Phase 1, Launch Offer" />
        </Col>
        <Col span={7}>
          <ProFormDatePicker name="startDate" label="Start Date" fieldProps={{ format: 'YYYY-MM-DD' }} placeholder="e.g., 2024-01-01" />
        </Col>
        <Col span={6}>
          <ProFormDatePicker name="phaseEndDate" label="End Date" fieldProps={{ format: 'YYYY-MM-DD' }} placeholder="e.g., 2024-12-31" />
        </Col>
        <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPhase}>Add</Button>
        </Col>
      </Row>
      <Form.Item name="phaseActive" valuePropName="checked" noStyle>
        <Switch checkedChildren="Set as Active Phase" unCheckedChildren="Set as Active Phase" style={{ marginTop: 16 }} />
      </Form.Item>
    </div>
  );

  const renderPhaseList = () => {
    if (!phases.length) {
      return <div style={{ textAlign: 'center', padding: 10, color: '#999', fontStyle: 'italic' }}>No phases added yet.</div>;
    }

    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

    return (
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8, color: '#666' }}><HolderOutlined /> Drag rows to reorder phases</p>
        <ProTable
          columns={[
            { title: '', dataIndex: 'sort', width: 30, render: () => <HolderOutlined style={{ cursor: 'grab', color: '#999' }} /> },
            {
              title: 'Phase Name', dataIndex: 'name', key: 'name',
              render: (text: string, record: Phase) => (
                <Space><strong>{text}</strong>{record.name === currentPhase && <Tag color="green">Active</Tag>}</Space>
              )
            },
            { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', render: (date: any) => date ? date.format('YYYY-MM-DD') : 'Not set' },
            { title: 'End Date', dataIndex: 'endDate', key: 'endDate', render: (date: any) => date ? date.format('YYYY-MM-DD') : 'Not set' },
            {
              title: 'Actions', key: 'actions',
              render: (_: any, record: Phase) => (
                <Space>
                  <Button
                    size="small"
                    type={record.name === currentPhase ? 'default' : 'primary'}
                    onClick={() => setActivePhase(record.key!)}
                    disabled={record.name === currentPhase}
                  >
                    {record.name === currentPhase ? 'Active' : 'Set Active'}
                  </Button>
                  <Popconfirm
                    title="Delete this phase?"
                    description="This will remove pricing for all units in this phase."
                    onConfirm={() => deletePhase(record.key!)}
                    okText="Yes" cancelText="No"
                  >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
          dataSource={sortedPhases}
          pagination={false}
          rowKey="key"
          size="small"
          options={false}
          search={false}
        />
      </div>
    );
  };

  const renderUnitPricingTable = () => {
    if (units.length === 0 || phases.length === 0) return null;
    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

    const columns: any = [
      {
        title: propertyType === 'land' ? 'Plot Type' : 'Unit Details',
        dataIndex: 'unitType', key: 'unitType', width: 250, fixed: 'left',
        render: (_: any, record: Unit) => <strong>{getUnitLabel(record)}</strong>
      }
    ];

    sortedPhases.forEach((phase) => {
      columns.push({
        title: (
          <div>
            {phase.name}
            {phase.name === currentPhase && <Tag color="green" style={{ marginLeft: 5 }}>Active</Tag>}
          </div>
        ),
        key: phase.name,
        render: (_: any, record: Unit) => {
          const pricingItem = (record.phasePricing || []).find(p => p.phaseName === phase.name);
          const unitIdentifier = record._id || record.key;
          return (
            <InputNumber
              value={pricingItem?.price || 0}
              onChange={(value) => updateUnitPhasePrice(unitIdentifier!, phase.name, Number(value))}
              placeholder="Enter price"
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          );
        },
        width: 180,
      });
    });

    return (
      <>
        <h4>Unit Prices by Phase (KES)</h4>
        <Table
          columns={columns}
          dataSource={units}
          pagination={false}
          size="small"
          rowKey={(record) => record._id || record.key!}
          scroll={{ x: 'max-content' }}
        />
      </>
    );
  };

  const renderUnitList = () => {
    if (units.length === 0) {
      return <div style={{ textAlign: 'center', padding: 20, color: '#999', fontStyle: 'italic', background: '#fafafa', borderRadius: 8 }}>No units added yet.</div>;
    }

    const groupedUnits = propertyType === 'apartment'
      ? blocks.map(block => ({
        blockName: block.name,
        blockId: block.tempId,
        units: units.filter(u => u.blockId === block.tempId)
      })).filter(g => g.units.length > 0)
      : null;

    const columns = [
      {
        title: propertyType === 'land' ? 'Plot Type' : 'Unit Details',
        dataIndex: 'unitType', key: 'unitType',
        render: (_: any, record: Unit) => (
          <Space>
            <strong>{getUnitLabel(record)}</strong>
            {record.trackIndividualUnits && <Tag color="purple" icon={<UnorderedListOutlined />}>Individual Tracking</Tag>}
          </Space>
        )
      },
      { title: propertyType === 'land' ? 'Total Plots' : 'Total Units', dataIndex: 'totalUnits', key: 'totalUnits' },
      { title: propertyType === 'land' ? 'Available Plots' : 'Available Units', dataIndex: 'availableUnits', key: 'availableUnits' },
      { title: 'Start Price (KES)', dataIndex: 'priceStartPoint', key: 'priceStartPoint', render: (price: number) => `${price?.toLocaleString() || 0}` },
      {
        title: 'Actions', key: 'actions',
        render: (_: any, record: Unit) => (
          <Space>
            {record.trackIndividualUnits && record.apartments && (
              <Button type="link" icon={<UnorderedListOutlined />} onClick={() => viewApartments(record)} size="small">
                View Apartments ({record.apartments.length})
              </Button>
            )}
            <Popconfirm
              title="Delete this unit?"
              onConfirm={() => removeUnit(record.key || record._id!)}
              okText="Yes" cancelText="No"
              disabled={!!(record._id && edit && record.totalUnits !== record.availableUnits)}
            >
              <Button
                type="text" danger icon={<DeleteOutlined />}
                disabled={!!(record._id && edit && record.totalUnits !== record.availableUnits)}
              />
            </Popconfirm>
          </Space>
        )
      }
    ];

    return propertyType === 'apartment' && groupedUnits ? (
      <>
        {groupedUnits.map(group => (
          <div key={group.blockId} style={{ marginBottom: 24 }}>
            <h4 style={{ background: '#f0f0f0', padding: '8px 12px', borderRadius: 4 }}>
              {group.blockName} ({group.units.length} units)
            </h4>
            <Table columns={columns} dataSource={group.units} pagination={false} size="small" rowKey={(r) => r.key || r._id!} scroll={{ x: 'max-content' }} />
          </div>
        ))}
      </>
    ) : (
      <Table columns={columns} dataSource={units} pagination={false} size="small" rowKey={(r) => r.key || r._id!} scroll={{ x: 'max-content' }} />
    );
  };

  const renderApartmentNamingModal = () => (
    <Modal
      title="Name Individual Apartments (Optional)"
      open={apartmentModalVisible}
      onCancel={() => { setApartmentModalVisible(false); setApartmentNames([]); setTempUnitData(null); }}
      width={800}
      footer={[
        <Button key="skip" onClick={skipApartmentNamingAndAddUnit}>Skip - Don't Track Individually</Button>,
        <Button key="save" type="primary" onClick={saveApartmentNamesAndAddUnit}>Save & Add Unit</Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}>You can name each apartment individually or skip to track them as a group.</p>
        <div style={{ marginBottom: 16 }}>
          <label>Naming Pattern:</label>
          <Radio.Group
            value={namingPattern}
            onChange={(e) => {
              setNamingPattern(e.target.value);
              setApartmentNames(generateApartmentNames(
                tempUnitData?.unitNumber || 'Unit',
                tempUnitData?.totalUnits || 1,
                e.target.value,
                tempUnitData?.unitType || ''
              ));
            }}
            style={{ marginLeft: 8 }}
          >
            <Radio value="sequential">Sequential (BA111-1, BA111-2)</Radio>
            <Radio value="letters">Letters (BA111-A, BA111-B)</Radio>
            <Radio value="custom">Custom Names</Radio>
          </Radio.Group>
        </div>
      </div>

      <Table
        dataSource={apartmentNames}
        pagination={false}
        size="small"
        scroll={{ y: 400 }}
        columns={[
          { title: '#', key: 'index', width: 50, render: (_, __, index) => index + 1 },
          {
            title: 'Apartment Name', key: 'name',
            render: (_, record, index) => (
              <Input
                value={record.apartmentName}
                onChange={(e) => handleApartmentNameChange(index, e.target.value)}
                placeholder="Enter apartment name"
              />
            )
          },
          {
            title: 'Status', dataIndex: 'status', key: 'status', width: 120,
            render: (status: string) => <Tag color="green">{status}</Tag>
          }
        ]}
        rowKey={(record) => record.key!}
      />

      <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
        <p style={{ margin: 0, color: '#0050b3' }}>
          💡 <strong>Tip:</strong> Individual tracking allows you to manage each apartment separately.
          If you skip, all {tempUnitData?.totalUnits} units will be tracked as a group.
        </p>
      </div>
    </Modal>
  );

  const renderViewApartmentsModal = () => (
    <Modal
      title={`Apartments in ${selectedUnitForView ? getUnitLabel(selectedUnitForView) : ''}`}
      open={viewApartmentsModalVisible}
      onCancel={() => { setViewApartmentsModalVisible(false); setSelectedUnitForView(null); }}
      width={700}
      footer={[<Button key="close" onClick={() => setViewApartmentsModalVisible(false)}>Close</Button>]}
    >
      {selectedUnitForView?.apartments && (
        <Table
          dataSource={selectedUnitForView.apartments}
          pagination={false}
          size="small"
          columns={[
            { title: '#', key: 'index', width: 50, render: (_, __, index) => index + 1 },
            { title: 'Apartment Name', dataIndex: 'apartmentName', key: 'apartmentName', render: (text: string) => <strong>{text}</strong> },
            {
              title: 'Status', dataIndex: 'status', key: 'status',
              render: (status: string) => (
                <Tag color={{ available: 'green', sold: 'red', reserved: 'orange' }[status]}>
                  {status.toUpperCase()}
                </Tag>
              )
            },
            { title: 'Sold To', dataIndex: 'soldTo', key: 'soldTo', render: (text: string) => text || '-' }
          ]}
          rowKey={(record) => record.key || record._id!}
        />
      )}
    </Modal>
  );

  // ── Step navigation ────────────────────────────────────────────────
  const goToStep2 = async () => {
    try {
      // Validate only the Basic Information fields before advancing
      await formRef.validateFields(['name', 'propertyType', 'status', 'address', 'county', 'constituency', 'propertyManager']);
      // Sync propertyType state from form in case onChange didn't fire
      const formPropertyType = formRef.getFieldValue('propertyType');
      if (formPropertyType) setPropertyType(normalizePropertyType(formPropertyType));
      setCurrentStep(1);
    } catch {
      message.error('Please fill in all required fields before continuing');
    }
  };

  const goToStep1 = () => setCurrentStep(0);

  return (
    <>
      <ModalForm
        form={formRef}
        title={edit ? 'Edit Property' : 'Add New Property'}
        initialValues={
          edit && data ? {
            name: data.name || '',
            propertyType: normalizePropertyType(data.propertyType || ''),
            status: data.status || 'available',
            address: data.location?.address || '',
            county: data.location?.county || '',
            constituency: data.location?.constituency || '',
            propertyManager: { label: data.propertyManager?.name || '', value: data.propertyManager?._id || '' },
          } : {
            totalUnits: 1,
            phaseActive: false,
            priceStartPoint: 0
          }
        }
        onFinish={async (values) => {
          if (!validateBeforeSubmit()) return false;

          const formData: any = {
            name: values.name,
            propertyType: values.propertyType,
            propertyPurpose: values.propertyPurpose || propertyPurpose,
            status: values.status,
            location: { address: values.address, county: values.county, constituency: values.constituency },
            propertyManager: values.propertyManager.value || values.propertyManager,
            shop_id: currentShopId,
            phases: phases.map(phase => ({
              _id: phase._id,
              name: phase.name,
              startDate: phase.startDate.toISOString(),
              endDate: phase.endDate.toISOString(),
              active: phase.active
            })),
            currentPhase: currentPhase || derivedCurrentPhase,
            units: units.map(unit => ({
              _id: unit._id,
              unitType: unit.unitType,
              unitNumber: unit.unitNumber,
              blockId: unit.blockId,
              floorId: unit.floorId,
              plotSize: unit.plotSize,
              totalUnits: unit.totalUnits,
              availableUnits: unit.availableUnits,
              status: unit.status,
              basePrice: unit.basePrice || unit.priceStartPoint,
              price: unit.price || unit.priceStartPoint,
              priceStartPoint: unit.priceStartPoint,
              trackIndividualUnits: unit.trackIndividualUnits || false,
              apartments: unit.apartments || undefined,
              phasePricing: (unit.phasePricing || []).map(pricing => {
                const matchingPhase = phases.find(p => p.name === pricing.phaseName);
                return {
                  _id: pricing._id,
                  phaseId: matchingPhase?._id || pricing.phaseId,
                  phaseName: pricing.phaseName,
                  price: pricing.price,
                  active: pricing.active,
                  startDate: pricing.startDate
                };
              })
            }))
          };

          const resolvedType = normalizePropertyType(formRef.getFieldValue('propertyType') || propertyType);
          if (resolvedType === 'apartment') {
            formData.blocks = blocks.map(block => ({
              _id: block._id,
              name: block.name,
              description: block.description,
              totalFloors: block.totalFloors,
              status: block.status,
              floors: block.floors.map(floor => ({
                _id: floor._id,
                name: floor.name,
                floorNumber: floor.floorNumber,
                status: floor.status || 'active',
                tempId: floor.tempId
              }))
            }));
          }

          try {
            if (edit) {
              await updateProperty(data._id, formData);
              message.success('Property updated successfully');
            } else {
              await createProperty(formData);
              message.success('Property created successfully');
            }
            actionRef?.current?.reload();
            setCurrentStep(0);
            return true;
          } catch (error) {
            message.error('An error occurred');
            return false;
          }
        }}
        modalProps={{
          destroyOnClose: true,
          centered: true,
          afterClose: () => setCurrentStep(0),
        }}
        autoFocusFirstInput
        width={1200}
        // Hide the default submit button on step 1; show it only on step 2
        submitter={{
          searchConfig: { submitText: edit ? 'Update Property' : 'Create Property' },
          render: (_, defaultDoms) => {
            if (currentStep === 0) {
              return (
                <Button type="primary" onClick={goToStep2}>
                  Next: Units & Pricing →
                </Button>
              );
            }
            return (
              <Space>
                <Button onClick={goToStep1}>← Back</Button>
                {defaultDoms[1]}
              </Space>
            );
          },
        }}
        trigger={
          edit ? (
            <Button icon={<EditOutlined />} size="small" />
          ) : quickMode ? (
            <span style={{ display: 'flex', gap: 8 }}><HomeOutlined />New Property</span>
          ) : (
            <Button type="primary" icon={<PlusOutlined />}>Add New Property</Button>
          )
        }
      >
        {/* ── Step indicator and content ── */}
        <Row gutter={24}>
          <Col span={6}>
            <Steps
              current={currentStep}
              direction="vertical"
              size="small"
              items={[
                { title: 'Basic Information', description: 'Name, type & location' },
                { title: 'Units & Pricing', description: 'Phases, blocks & units' },
              ]}
            />
          </Col>
          <Col span={18}>
            {/* ── Step 1: Basic Information ── */}
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              {/* Alert for undefined fields */}
              {undefinedFields.length > 0 && (
                <div style={{ 
                  marginBottom: 24, 
                  padding: '12px 16px', 
                  background: '#fff7e6', 
                  border: '1px solid #ffd591', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12
                }}>
                  <div style={{ fontSize: 16, marginTop: 2 }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: '#d46b08' }}>
                      Complete Property Information
                    </div>
                    <div style={{ color: '#8c5a00', fontSize: 14, marginBottom: 12 }}>
                      The following fields need to be defined for better property management:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {undefinedFields.map((field, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          padding: '6px 12px',
                          background: 'rgba(255, 255, 255, 0.6)',
                          borderRadius: 4,
                          fontSize: 13
                        }}>
                          <span style={{ fontSize: 14 }}>{field.icon}</span>
                          <span style={{ flex: 1 }}>{field.message}</span>
                          <Button 
                            type="link" 
                            size="small" 
                            style={{ padding: 0, height: 'auto', fontSize: 12 }}
                            onClick={() => {
                              // Focus on the undefined field
                              const fieldElement = document.querySelector(`[name="${field.field}"]`) as HTMLElement;
                              if (fieldElement) {
                                fieldElement.focus();
                                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                          >
                            {field.action} →
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <Row gutter={16}>
                <Col span={12}>
                  <ProFormText name="name" label="Property Name" placeholder="Enter property name" rules={[{ required: true, message: 'Please enter the property name' }]} />
                </Col>
                <Col span={12}>
                  <ProFormSelect
                    name="propertyType"
                    label="Property Type"
                    rules={[{ required: true, message: 'Please select property type' }]}
                    options={propertyTypeOptions}
                    fieldProps={{
                      loading: isLoadingPropertyTypes,
                      placeholder: isLoadingPropertyTypes
                        ? 'Loading...'
                        : propertyTypeOptions.length === 0
                          ? 'No types found'
                          : 'Select property type',
                      onChange: (value) => setPropertyType(normalizePropertyType(value)),
                      disabled: edit,
                    }}
                  />
                </Col>
            <Col span={6}>
              <ProFormSelect
                name="propertyPurpose"
                label="Property Purpose"
                rules={[{ required: true, message: 'Please select property purpose' }]}
                options={[
                  { label: 'For Sale', value: 'sale' },
                  { label: 'For Lease', value: 'lease' },
                  { label: 'For Rent', value: 'rent' },
                ]}
                fieldProps={{
                  placeholder: 'Select purpose',
                  onChange: (value: string) => setPropertyPurpose(value),
                  disabled: edit,
                }}
                initialValue={propertyPurpose}
              />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <ProFormSelect
                name="status" label="Property Status" initialValue="available"
                options={
                  propertyPurpose === 'sale' 
                    ? [
                        { label: 'Available', value: 'available' },
                        { label: 'Sold', value: 'sold' },
                        { label: 'Reserved', value: 'reserved' },
                        { label: 'Under Construction', value: 'under_construction' },
                      ]
                    : propertyPurpose === 'lease'
                    ? [
                        { label: 'Available', value: 'available' },
                        { label: 'Leased', value: 'leased' },
                        { label: 'Reserved', value: 'reserved' },
                        { label: 'Under Construction', value: 'under_construction' },
                      ]
                    : [
                        { label: 'Available', value: 'available' },
                        { label: 'Rented', value: 'rented' },
                        { label: 'Reserved', value: 'reserved' },
                        { label: 'Under Construction', value: 'under_construction' },
                      ]
                }
                rules={[{ required: true, message: 'Please select a status' }]}
              />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <ProFormText 
                name="address" 
                label="Address" 
                placeholder={getFieldPlaceholder('address')} 
                rules={[{ required: true, message: 'Please enter the address' }]}
                tooltip="Street address, building name, or landmark location"
              />
            </Col>
            <Col span={8}>
              <ProFormText 
                name="county" 
                label="County" 
                placeholder={getFieldPlaceholder('county')} 
                rules={[{ required: true, message: 'Please enter the county' }]}
                tooltip="County where the property is located"
              />
            </Col>
            <Col span={8}>
              <ProFormText 
                name="constituency" 
                label="Constituency" 
                placeholder={getFieldPlaceholder('constituency')}
                tooltip="Constituency or sub-county (optional)"
              />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <ProFormSelect
                name="propertyManager" label="Property Manager"
                placeholder="Select a property manager"
                rules={[{ required: true, message: 'Please select a property manager' }]}
                options={propertyManagers?.map((manager: any) => ({ label: manager.fullname, value: manager._id }))}
                fieldProps={{ allowClear: true }}
              />
            </Col>
          </Row>
        </div>

        {/* ── Step 2: Units & Pricing ── */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          {propertyPurpose === 'sale' && (
            <div>
              <Divider orientation="left">
                <Space>
                  <TagOutlined />Pricing Phases
                  {currentPhase && <Tag color="green">Current Phase: {currentPhase}</Tag>}
                </Space>
              </Divider>
              {renderPhaseForm()}
              {phasesValidationError && (
                <div style={{ color: '#ff4d4f', marginBottom: 16, padding: '8px 12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
                  ⚠️ Please add at least one pricing phase
                </div>
              )}
              {renderPhaseList()}
            </div>
          )}

          {renderBlockManagement()}

          <div>
            <Divider orientation="left">
              <Space>
                <HomeOutlined />
                {normalizePropertyType(formRef.getFieldValue('propertyType') || propertyType) === 'land' ? 'Land Plots' : 'Property Units'}
                {units.length > 0 && <Tag color="blue">{units.length} units added</Tag>}
              </Space>
            </Divider>

            {(() => {
              const resolvedType = normalizePropertyType(
                formRef.getFieldValue('propertyType') || propertyType
              );
              if (resolvedType === 'apartment') {
                return blocks.length > 0 ? renderApartmentUnitForm() : (
                  <div style={{ padding: 24, textAlign: 'center', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, marginBottom: 16 }}>
                    <BuildOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
                    <p style={{ margin: 0, color: '#666' }}>Please add at least one block before adding units</p>
                  </div>
                );
              }
              if (resolvedType === 'land') return renderLandUnitForm();
              return (
                <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', border: '1px dashed #d9d9d9', borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ margin: 0, color: '#999' }}>
                    {resolvedType
                      ? `Unit management is not configured for property type "${resolvedType}". Please check your property type slugs.` 
                      : 'Select a property type on the Basic Information tab to continue'
                    }
                  </p>
                </div>
              );
            })()}

            {unitsValidationError && (
              <div style={{ color: '#ff4d4f', marginBottom: 16, padding: '8px 12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
                ⚠️ Please add at least one {propertyType === 'land' ? 'plot' : 'unit'} to the property
              </div>
            )}
            {renderUnitList()}
          </div>

          {phases.length > 0 && units.length > 0 && (
            <div>
              <Divider orientation="left"><Space><TagOutlined />Phase Pricing Matrix</Space></Divider>
              {renderUnitPricingTable()}
            </div>
          )}
        </div>
            </Col>
          </Row>
      </ModalForm>

      {renderApartmentNamingModal()}
      {renderViewApartmentsModal()}
    </>
  );
};

export default AddEditPropertyModal;
