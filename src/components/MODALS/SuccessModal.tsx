import { useState } from "react";
import Lottie from "lottie-react";
import fssanimation from "../Loaders/new order confirmed.json";
import { useAppDispatch } from "../../store";
import { closeModal } from "../../features/Order/OrderSlice";

export default function SuccesssModal() {
  const [animationVisible, setAnimationVisible] = useState(true);

  const dispatch = useAppDispatch()

  const handleAnimationComplete = () => {
    setAnimationVisible(false);
    dispatch(closeModal())
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      {animationVisible && (
        <Lottie
          animationData={fssanimation}
          loop={false}
          height={400}
          width={400}
          onComplete={handleAnimationComplete}
        />
      )}
    </div>
  );
}