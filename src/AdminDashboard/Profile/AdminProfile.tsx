import { useParams } from "react-router-dom";
import ProfileDetails from "@components/Profile/ProfileDetails";

function AdminProfile() {
  const { id } = useParams();

  return <ProfileDetails userId={id} />;
}

export default AdminProfile;
