import * as Yup from 'yup';

const validationSchema: Yup.Schema<{ pin: string }> = Yup.object({
  pin: Yup.string()
    .required('PIN is required')
    .matches(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export default validationSchema;
