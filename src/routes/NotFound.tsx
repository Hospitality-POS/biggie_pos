import { Button, Result } from 'antd/lib'
import { useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()
  return (
    <Result
    status="404"
    title="404"
    subTitle="Sorry, the page you visited does not exist."
    extra={<Button type="primary" onClick={()=>navigate('/tables')}>Back Home</Button>}
    style={{margin: "0 auto"}}
  />
  )
}

export default NotFound