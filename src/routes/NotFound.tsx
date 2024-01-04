import { Button, Result } from 'antd/lib'

function NotFound() {
  return (
    <Result
    status="404"
    title="404"
    subTitle="Sorry, the page you visited does not exist."
    extra={<Button type="primary">Back Home</Button>}
    style={{margin: "0 auto"}}
  />
  )
}

export default NotFound