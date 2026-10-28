import { useEffect, useState, useCallback } from "react";
import { Button, Form, Input, Modal, Typography, message, Row, Col, AutoComplete, Radio, Select, DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { useHealthcareAccess } from "@pages/Healthcare/shared";
import { fetchPatient, savePatientProfile, type Allergy, type PatientProfile } from "@services/healthcare";
import {
    EditOutlined, EnvironmentOutlined, IdcardOutlined,
    MailOutlined, SaveOutlined, UserAddOutlined, UserOutlined, ShopOutlined,
} from "@ant-design/icons";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { addNewCustomer, updateCustomer } from "@services/customers";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

interface AddCustomerModalProps {
    visible: boolean;
    onClose: () => void;
    /** Receives the saved customer when the API returns it (e.g. to select it straight away) */
    onSuccess?: (saved?: any) => void;
    customer?: any;
    mode?: "add" | "edit";
    /**
     * When set, the modal opens in lead-conversion mode:
     * - Always treated as "add" (creates a new customer)
     * - Fields pre-filled from the lead's contact data
     * - Green accent + "Converting from Lead" banner
     */
    leadPrefill?: {
        customer_name?: string;
        company_name?: string;
        contact_person?: string;
        phone?: string;
        email?: string;
        location?: string;
        entity_type?: 'individual' | 'company';
    };
    /** Plain "add" mode with a name or phone already filled in (e.g. from a search box) */
    prefill?: { customer_name?: string; phone?: string };
}

/** The Medical section of the form (hospital mode) */
interface MedicalValues {
    national_id?: string;
    blood_group?: string;
    allergies?: string[];
    chronic_conditions?: string[];
    insurance?: { provider?: string; member_number?: string };
    next_of_kin?: { name?: string; relationship?: string; phone?: string };
}

/** Parse a raw phone string into the { code, phone, short } shape PhoneInput expects */
function parsePhoneForInput(raw?: string) {
    if (!raw) return undefined;
    const s = String(raw).replace(/\s/g, "");
    const local = s.startsWith("+254") ? s.slice(4)
        : s.startsWith("254") ? s.slice(3)
            : s;
    return { code: 254, phone: local, short: "KE" };
}

// ── Google Places functionality ───────────────────────────────────────────────
const useGooglePlacesAutocomplete = () => {
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadGoogleMaps = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if ((window as any).google?.maps?.places) { resolve(); return; }
            if (document.getElementById("gmap-script")) {
                const check = setInterval(() => {
                    if ((window as any).google?.maps?.places) { clearInterval(check); resolve(); }
                }, 100);
                setTimeout(() => { clearInterval(check); reject("timeout"); }, 10000);
                return;
            }
            const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
            if (!key) { reject("no key"); return; }
            const script = document.createElement("script");
            script.id = "gmap-script";
            script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                const check = setInterval(() => {
                    if ((window as any).google?.maps?.places) { clearInterval(check); resolve(); }
                }, 100);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    useEffect(() => {
        const init = async () => {
            try {
                await loadGoogleMaps();
            } catch (error) {
                console.log("Google Maps not available");
            }
        };
        init();
    }, []);

    const getPlacePredictions = useCallback(async (input: string) => {
        if (!input || !(window as any).google?.maps?.places) {
            setOptions([]);
            return;
        }

        setLoading(true);
        try {
            const service = new (window as any).google.maps.places.AutocompleteService();
            const predictions = await new Promise<any[]>((resolve, reject) => {
                service.getPlacePredictions(
                    { input, componentRestrictions: { country: "KE" } },
                    (results: any[], status: string) => {
                        if (status === "OK") {
                            resolve(results);
                        } else {
                            reject(status);
                        }
                    }
                );
            });
            
            setOptions(predictions.map(p => ({
                value: p.description,
                label: p.description,
                place_id: p.place_id,
            })));
        } catch (error) {
            setOptions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const getPlaceDetails = useCallback(async (placeId: string) => {
        if (!placeId || !(window as any).google?.maps?.places) {
            return null;
        }

        try {
            const service = new (window as any).google.maps.places.PlacesService(document.createElement("div"));
            const details = await new Promise<any>((resolve, reject) => {
                service.getDetails(
                    { placeId, fields: ['address_components', 'formatted_address'] },
                    (result: any, status: string) => {
                        if (status === "OK") {
                            resolve(result);
                        } else {
                            reject(status);
                        }
                    }
                );
            });

            const getComponent = (type: string) =>
                details.address_components?.find((c: any) => c.types.includes(type))?.long_name ?? null;

            return {
                street: getComponent("route") ? `${getComponent("street_number") || ""} ${getComponent("route")}`.trim() : null,
                building: getComponent("establishment") || getComponent("point_of_interest"),
                city: getComponent("locality") || getComponent("administrative_area_level_2"),
                county: getComponent("administrative_area_level_1"),
                postal_code: getComponent("postal_code"),
                country: getComponent("country"),
            };
        } catch (error) {
            return null;
        }
    }, []);

    return { options, loading, getPlacePredictions, getPlaceDetails };
};

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
    visible, onClose, onSuccess, customer, mode = "add", leadPrefill, prefill,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [entityType, setEntityType] = useState<'individual' | 'company'>('individual');
    const { options, loading: placesLoading, getPlacePredictions, getPlaceDetails } = useGooglePlacesAutocomplete();
    const queryClient = useQueryClient();

    // leadPrefill always forces create mode regardless of mode prop
    const isFromLead = !!leadPrefill;
    const isEdit = mode === "edit" && !isFromLead;

    // ── Hospital mode: the customer is a patient ──────────────────────────────
    // Patients are always individuals; business fields (company, contact
    // person, KRA PIN) give way to gender, date of birth and, with Healthcare
    // patient records on, the medical details clinicians need at check-in.
    const isHospital = (localStorage.getItem("posMode") ?? "") === "hospital";
    const { patientRecords } = useHealthcareSettings();
    const { managePatients } = useHealthcareAccess();
    const askMedical = isHospital && patientRecords && managePatients;
    const [existingProfile, setExistingProfile] = useState<PatientProfile | null>(null);
    const noun = isHospital ? "Patient" : "Customer";

    // Editing a patient: load their medical details into the form
    useEffect(() => {
        setExistingProfile(null);
        if (!visible || !isEdit || !customer?._id || !askMedical) return;
        let cancelled = false;
        fetchPatient(customer._id)
            .then(({ profile }) => {
                if (cancelled || !profile) return;
                setExistingProfile(profile);
                form.setFieldsValue({
                    medical: {
                        national_id: profile.national_id,
                        blood_group: profile.blood_group ?? "unknown",
                        allergies: (profile.allergies ?? []).map((a) => a.substance),
                        chronic_conditions: profile.chronic_conditions ?? [],
                        insurance: { provider: profile.insurance?.provider, member_number: profile.insurance?.member_number },
                        next_of_kin: profile.next_of_kin,
                    },
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [visible, isEdit, customer?._id, askMedical, form]);

    /** Saves the medical section; keeps reaction/severity already recorded for an allergy. */
    const saveMedical = async (customerId: string | undefined, medical: MedicalValues | undefined) => {
        if (!askMedical || !customerId || !medical) return;
        const known = new Map((existingProfile?.allergies ?? []).map((a) => [a.substance.toLowerCase(), a]));
        const allergies: Allergy[] = (medical.allergies ?? []).map(
            (s) => known.get(String(s).toLowerCase()) ?? { substance: String(s).trim(), severity: "moderate" as const }
        );
        try {
            await savePatientProfile(customerId, {
                national_id: medical.national_id?.trim() || "",
                blood_group: medical.blood_group || "unknown",
                allergies,
                chronic_conditions: medical.chronic_conditions ?? [],
                insurance: { ...existingProfile?.insurance, ...medical.insurance },
                next_of_kin: medical.next_of_kin,
            });
            queryClient.invalidateQueries({ queryKey: ["healthcare-patient", customerId] });
            queryClient.invalidateQueries({ queryKey: ["healthcare-patient-profiles"] });
        } catch {
            message.warning("Patient saved, but the medical details couldn't be saved — add them on the Medical tab");
        }
    };

    useEffect(() => {
        if (!visible) return;

        if (isFromLead) {
            const entityTypeValue = leadPrefill?.entity_type || 'individual';
            setEntityType(entityTypeValue);
            form.setFieldsValue({
                entity_type: entityTypeValue,
                customer_name: entityTypeValue === 'individual' ? (leadPrefill?.customer_name || "") : undefined,
                company_name: entityTypeValue === 'company' ? (leadPrefill?.company_name || "") : undefined,
                contact_person: leadPrefill?.contact_person || "",
                phoneNumber: leadPrefill?.phone ? parsePhoneForInput(leadPrefill.phone) : undefined,
                email: leadPrefill?.email || "",
                location: leadPrefill?.location || "",
            });
        } else if (isEdit && customer) {
            const entityTypeValue = customer.entity_type || 'individual';
            setEntityType(entityTypeValue);
            form.setFieldsValue({
                entity_type: entityTypeValue,
                customer_name: entityTypeValue === 'individual' ? (customer.customer_name || "") : undefined,
                company_name: entityTypeValue === 'company' ? (customer.company_name || "") : undefined,
                contact_person: customer.contact_person || "",
                phoneNumber: parsePhoneForInput(customer.phone),
                email: customer.email || "",
                location: customer.location || "",
                kra_pin: customer.kra_pin || "",
                address: customer.address || {},
                type: customer.type || "individual",
                payment_terms: customer.payment_terms,
                credit_limit: customer.credit_limit,
                assigned_to: customer.assigned_to || "",
                notes: customer.notes || "",
                gender: customer.gender,
                date_of_birth: customer.date_of_birth ? dayjs(customer.date_of_birth) : undefined,
            });
        } else {
            form.resetFields();
            setEntityType('individual');
            form.setFieldsValue({
                entity_type: 'individual',
                // Quick-add from a search box: start with what was typed
                customer_name: prefill?.customer_name || undefined,
                phoneNumber: prefill?.phone ? parsePhoneForInput(prefill.phone) : undefined,
            });
        }
    }, [visible, mode, customer, leadPrefill, prefill, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            // Construct address object with all fields
            const address = values.address ? {
                street: values.address.street || undefined,
                building: values.address.building || undefined,
                floor: values.address.floor || undefined,
                city: values.address.city || undefined,
                county: values.address.county || undefined,
                postal_code: values.address.postal_code || undefined,
                country: values.address.country || undefined,
                coordinates: values.address.coordinates || undefined,
                address_type: values.address.address_type || "both",
                is_primary: values.address.is_primary === "true" || values.address.is_primary === true,
                landmark: values.address.landmark || undefined,
                directions: values.address.directions || undefined,
            } : undefined;

            const payload = {
                entity_type: values.entity_type || 'individual',
                customer_name: values.entity_type === 'individual' ? values.customer_name : undefined,
                company_name: values.entity_type === 'company' ? values.company_name : undefined,
                contact_person: values.contact_person,
                phone: values.phoneNumber?.phone ? parseInt(values.phoneNumber.phone) : undefined,
                email: values.email || undefined,
                address: address,
                billing_addresses: [],
                type: values.type || "individual",
                kra_pin: values.kra_pin || undefined,
                payment_terms: values.payment_terms ? parseInt(values.payment_terms) : undefined,
                credit_limit: values.credit_limit ? parseFloat(values.credit_limit) : undefined,
                assigned_to: values.assigned_to || undefined,
                notes: values.notes || undefined,
                ...(isHospital ? {
                    gender: values.gender || undefined,
                    date_of_birth: (values.date_of_birth as Dayjs | undefined)?.toISOString(),
                } : {}),
            };

            // Remove undefined fields to keep payload clean
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    delete payload[key];
                }
            });

            const response = isEdit && customer?._id
                ? await updateCustomer(customer._id, payload)
                : await addNewCustomer(payload);

            if (response?.status === 200 || response?.status === 201) {
                const saved = response?.data?.customer ?? response?.data;
                await saveMedical(isEdit ? customer?._id : saved?._id, values.medical);
                message.success(
                    isFromLead ? "Customer created from lead successfully!"
                        : isEdit ? `${noun} updated successfully!`
                            : `${noun} added successfully!`
                );
                form.resetFields();
                onClose();
                onSuccess?.(saved);
            }
        } catch (error: any) {
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                `Failed to ${isEdit ? "update" : "add"} customer`
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (loading) return;
        form.resetFields();
        onClose();
    };

    const accentColor = isFromLead ? C.green : isEdit ? C.blue : C.primary;
    const accentBg = isFromLead ? "#f0fdf4" : isEdit ? "#eff6ff" : C.primaryLight;
    const titleText = isFromLead ? "Convert Lead to Customer"
        : isEdit ? `Edit ${noun}`
            : `Add New ${noun}`;

    return (
        <Modal
            open={visible}
            onCancel={handleCancel}
            destroyOnClose
            style={{ top: 20 }}
            width="min(800px, 96vw)"
            footer={null}
            styles={{ body: { padding: "20px 24px 24px" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: accentBg, borderRadius: 7, padding: "4px 6px", color: accentColor, fontSize: 14, lineHeight: 1 }}>
                        {isEdit ? <EditOutlined /> : <UserAddOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14, color: C.darkText }}>{titleText}</Text>
                </div>
            }
        >
            {/* Lead conversion info banner */}
            {isFromLead && (
                <div style={{
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                    borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                    display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                    <UserAddOutlined style={{ color: C.green, marginTop: 2, flexShrink: 0 }} />
                    <div>
                        <Text strong style={{ fontSize: 12, color: C.green, display: "block" }}>Converting from Lead</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>
                            Fields pre-filled from lead data. Review and save to create the customer record.
                        </Text>
                    </div>
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>

                {/* Basic Information Section */}
                <div style={{
                    background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8,
                    padding: 16, marginBottom: 16
                }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, marginBottom: 12, display: "block" }}>
                        Basic Information
                    </Text>
                    
                    {/* Entity Type — patients are always individuals */}
                    <Form.Item name="entity_type" label="Entity Type" initialValue="individual" hidden={isHospital}>
                        <Radio.Group
                            onChange={(e) => setEntityType(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <Radio.Button value="individual" style={{ marginRight: 8 }}>
                                <UserOutlined /> Individual
                            </Radio.Button>
                            <Radio.Button value="company">
                                <ShopOutlined /> Company
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {/* Name fields based on entity type */}
                    {entityType === 'individual' ? (
                        <Form.Item
                            name="customer_name" label={`${noun} Name`}
                            rules={[
                                { required: true, message: `${noun} name is required` },
                                { min: 2, message: "Name must be at least 2 characters" },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: C.subText }} />}
                                placeholder={`Enter ${noun.toLowerCase()} full name`}
                                style={{ borderRadius: 8 }}
                                autoFocus
                            />
                        </Form.Item>
                    ) : (
                        <Form.Item
                            name="company_name" label="Company Name"
                            rules={[
                                { required: true, message: "Company name is required for company customers" },
                            ]}
                        >
                            <Input
                                prefix={<ShopOutlined style={{ color: C.subText }} />}
                                placeholder="Enter company name"
                                style={{ borderRadius: 8 }}
                                autoFocus
                            />
                        </Form.Item>
                    )}

                    {/* Contact Person (optional for both, recommended for company) — next of kin covers this for patients */}
                    {!isHospital && (
                        <Form.Item name="contact_person" label="Contact Person">
                            <Input
                                prefix={<UserOutlined style={{ color: C.subText }} />}
                                placeholder={entityType === 'company' ? "Primary contact person" : "Contact person (optional)"}
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>
                    )}

                    {isHospital && (
                        <Row gutter={12}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="gender" label="Gender">
                                    <Select
                                        allowClear
                                        placeholder="Select"
                                        options={[
                                            { value: "male", label: "Male" },
                                            { value: "female", label: "Female" },
                                            { value: "other", label: "Other" },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="date_of_birth" label="Date of Birth">
                                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} disabledDate={(d) => d.isAfter(dayjs())} />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <PhoneInput
                        label="Phone Number"
                        owner="phoneNumber"
                        rules={[{ required: true, message: "Please enter phone number" }]}
                    />

                    <Form.Item
                        name="email" label="Email Address"
                        rules={[{ type: "email", message: "Please enter a valid email" }]}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: C.subText }} />}
                            placeholder="customer@example.com"
                            type="email"
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>
                </div>

                {/* Address Information Section */}
                <div style={{
                    background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8,
                    padding: 16, marginBottom: 16
                }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, marginBottom: 12, display: "block" }}>
                        {isHospital ? "Residence" : "Address Information"}
                    </Text>
                    
                    <Row gutter={[12, 8]}>
                        <Col span={24}>
                            <Form.Item name={["address", "street"]} label="Street Address" style={{ marginBottom: 8 }}>
                                <AutoComplete
                                    options={options}
                                    onSearch={getPlacePredictions}
                                    onSelect={async (value: string, option: any) => {
                                        const details = await getPlaceDetails(option.place_id);
                                        if (details) {
                                            form.setFieldsValue({
                                                address: {
                                                    ...form.getFieldValue('address'),
                                                    street: details.street || value,
                                                    building: details.building,
                                                    city: details.city,
                                                    county: details.county,
                                                    postal_code: details.postal_code,
                                                    country: details.country,
                                                }
                                            });
                                        }
                                    }}
                                    style={{ width: '100%' }}
                                >
                                    <Input
                                        prefix={<EnvironmentOutlined style={{ color: C.subText }} />}
                                        placeholder="Start typing street address..."
                                    />
                                </AutoComplete>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={["address", "building"]} label="Building/Landmark" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. Westgate Tower" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={["address", "city"]} label="City/Town" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. Nairobi" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name={["address", "postal_code"]} label="Postal Code" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. 00100" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name={["address", "county"]} label="County/State" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. Nairobi" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name={["address", "country"]} label="Country" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. Kenya" />
                            </Form.Item>
                        </Col>
                    </Row>
                </div>

                {/* Additional Address Fields - Hidden */}
                {/* <div style={{
                    background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8,
                    padding: 16, marginBottom: 16
                }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, marginBottom: 12, display: "block" }}>
                        Additional Address Details
                    </Text>
                    
                    <Row gutter={[12, 8]}>
                        <Col span={8}>
                            <Form.Item name={["address", "floor"]} label="Floor" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. 5th Floor" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name={["address", "address_type"]} label="Address Type" style={{ marginBottom: 8 }}>
                                <Input placeholder="billing/shipping/both" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name={["address", "is_primary"]} label="Is Primary" style={{ marginBottom: 8 }}>
                                <Input placeholder="true/false" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={["address", "landmark"]} label="Landmark" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. Near City Mall" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={["address", "directions"]} label="Directions" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. Take elevator to 5th floor" />
                            </Form.Item>
                        </Col>
                    </Row>
                </div> */}

                {/* Business Information Section - Hidden */}
                {/* <div style={{
                    background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8,
                    padding: 16, marginBottom: 16
                }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, marginBottom: 12, display: "block" }}>
                        Business Information
                    </Text>
                    
                    <Row gutter={[12, 8]}>
                        <Col span={12}>
                            <Form.Item name="type" label="Customer Type" style={{ marginBottom: 8 }}>
                                <Input placeholder="individual/company" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="company_name" label="Company Name" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. Doe Enterprises" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="payment_terms" label="Payment Terms (days)" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. 30" type="number" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="credit_limit" label="Credit Limit (KES)" style={{ marginBottom: 8 }}>
                                <Input placeholder="e.g. 50000" type="number" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="assigned_to" label="Assigned To" style={{ marginBottom: 8 }}>
                                <Input placeholder="User ID" />
                            </Form.Item>
                        </Col>
                    </Row>
                </div> */}

                {/* Medical Section — hospital mode with Healthcare patient records on */}
                {askMedical && (
                    <div style={{
                        background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8,
                        padding: 16, marginBottom: 16
                    }}>
                        <Text strong style={{ fontSize: 13, color: C.darkText, marginBottom: 12, display: "block" }}>
                            Medical
                        </Text>
                        <Row gutter={[12, 0]}>
                            <Col xs={24} sm={12}>
                                <Form.Item name={["medical", "national_id"]} label="ID / Birth Cert. No.">
                                    <Input prefix={<IdcardOutlined style={{ color: C.subText }} />} style={{ borderRadius: 8 }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name={["medical", "blood_group"]} label="Blood Group" initialValue="unknown">
                                    <Select options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((b) => ({ value: b, label: b === "unknown" ? "Unknown" : b }))} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name={["medical", "allergies"]} label="Allergies" extra="Type and press Enter. Add reactions on the Medical tab.">
                                    <Select mode="tags" placeholder="e.g. Penicillin" tokenSeparators={[","]} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name={["medical", "chronic_conditions"]} label="Chronic Conditions">
                                    <Select mode="tags" placeholder="e.g. Diabetes" tokenSeparators={[","]} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name={["medical", "insurance", "provider"]} label="Insurance Provider">
                                    <Input placeholder="e.g. SHA, Jubilee, AAR (blank = cash)" style={{ borderRadius: 8 }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name={["medical", "insurance", "member_number"]} label="Member No.">
                                    <Input style={{ borderRadius: 8 }} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Text strong style={{ fontSize: 12, color: C.darkText, margin: "4px 0 8px", display: "block" }}>
                            Next of Kin
                        </Text>
                        <Row gutter={[12, 0]}>
                            <Col xs={24} sm={10}>
                                <Form.Item name={["medical", "next_of_kin", "name"]} label="Name">
                                    <Input style={{ borderRadius: 8 }} />
                                </Form.Item>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Form.Item name={["medical", "next_of_kin", "relationship"]} label="Relationship">
                                    <Input placeholder="e.g. Mother" style={{ borderRadius: 8 }} />
                                </Form.Item>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Form.Item name={["medical", "next_of_kin", "phone"]} label="Phone">
                                    <Input inputMode="tel" style={{ borderRadius: 8 }} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                )}

                {/* Tax Information Section — not asked of patients */}
                {!isHospital && (
                <div style={{
                    background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8,
                    padding: 16, marginBottom: 16
                }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, marginBottom: 12, display: "block" }}>
                        Tax Information
                    </Text>

                    <Form.Item
                        name="kra_pin" label="KRA PIN"
                        rules={[{
                            pattern: /^[A-Z]\d{9}[A-Z]$/,
                            message: "Invalid KRA PIN format. Expected: A123456789Z",
                        }]}
                    >
                        <Input
                            prefix={<IdcardOutlined style={{ color: C.subText }} />}
                            placeholder="e.g. A123456789Z (optional)"
                            style={{ borderRadius: 8, textTransform: "uppercase" }}
                            onChange={(e) => form.setFieldsValue({ kra_pin: e.target.value.toUpperCase() })}
                        />
                    </Form.Item>
                </div>
                )}

                {/* Notes Section */}
                <div style={{
                    background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8,
                    padding: 16, marginBottom: 16
                }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, marginBottom: 12, display: "block" }}>
                        Notes
                    </Text>

                    <Form.Item name="notes" label={`${noun} Notes`} style={{ marginBottom: 8 }}>
                        <Input.TextArea
                            placeholder={isHospital
                                ? "Anything staff should know, e.g. prefers Swahili, needs a wheelchair"
                                : "Add any notes about customer preferences, special requirements, etc."}
                            rows={3}
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>
                </div>

                <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 20, marginTop: -8 }}>
                    {isHospital
                        ? `Only the name and phone are required.${askMedical ? " A patient number is given when the patient is saved." : ""}`
                        : "Email, address and KRA PIN are optional."}
                </Text>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={handleCancel} disabled={loading} style={{ borderRadius: 8, height: 38 }}>
                        Cancel
                    </Button>
                    <Button
                        block type="primary" htmlType="submit" icon={<SaveOutlined />}
                        loading={loading}
                        style={{
                            background: accentColor,
                            borderColor: accentColor,
                            borderRadius: 8, height: 38, fontWeight: 500,
                        }}
                    >
                        {isFromLead ? "Create Customer from Lead" : isEdit ? `Update ${noun}` : `Add ${noun}`}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default AddCustomerModal;