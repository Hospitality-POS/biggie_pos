import { useParams } from "react-router-dom";
import ProfileDetails from "@components/Profile/ProfileDetails";

function Profile() {
  const { id } = useParams();

  return <ProfileDetails userId={id} />;
}

export default Profile;
