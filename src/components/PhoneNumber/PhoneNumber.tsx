import { Form } from "antd";
import CountryPhoneInput, { ConfigProvider } from "antd-country-phone-input";
import { isValidPhoneNumber } from "libphonenumber-js";
import en from "world_countries_lists/data/countries/en/world.json";

export const PhoneInput = (props) => {
  const getFlagUrl = (short) => {
    return `https://flagcdn.com/24x18/${short.toLowerCase()}.png`;
  };

  return (
    <ConfigProvider
      areaMapper={(area) => {
        return {
          ...area,
          emoji: (
            <img
              alt="flag"
              style={{ width: 18, height: 18, verticalAlign: "sub" }}
              src={getFlagUrl(area.short)}
            />
          ),
        };
      }}
      locale={en}
    >
      <Form.Item
        hasFeedback
        label={props.label}
        name={props.owner}
        initialValue={{
          short: "ke",
        }}
        rules={[
          {
            validator: async (_, value) => {
              if (
                !isValidPhoneNumber(`${value.code}${value.phone}`, value.short)
              )
                throw new Error("Invalid Phone Number");
            },
          },
        ]}
        required
      >
         <CountryPhoneInput
          inline
          autoComplete="none"
          style={{ width: `${props?.width}` }}
        /> 
        
      </Form.Item>
    </ConfigProvider>
  );
};