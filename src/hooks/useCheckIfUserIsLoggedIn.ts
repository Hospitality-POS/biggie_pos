import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { createCart } from '../features/Cart/CartActions';

function useCheckIfUserIsLoggedIn() {
 const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isUserLoggedIn,setIsUserIsLogged]=useState(false)
    function checkIfUserIsLoggedIn(tbl,user,cartError,setOpen){

        if (user) {
          setIsUserIsLogged(true)
             const cartDetails = {
               table_id: tbl,
               created_by: user.id,
             };
             navigate(`/dashboard/${tbl}`)
             dispatch(createCart(cartDetails));
             setOpen(false);
            //  cartError && !user?navigate(`/tables`):navigate(`/dashboard/${tbl}`);
           }
    }

  return {
checkIfUserIsLoggedIn,isUserLoggedIn
  }
}

export default useCheckIfUserIsLoggedIn