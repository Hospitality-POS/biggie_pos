import { useReducer } from "react";

const initialState = {
  filter: "",
  orderBy: "name",
  order: "asc",
  page: 0,
  rows: false,
  deleteConfirmationOpen: false,
  deleteCandidate: null,
  addLocationDialogOpen: false,
};
export default function useTableSettingsReducer() {
const [state,dispatch]=useReducer(tableSettingsReducer,initialState);

function tableSettingsReducer(state: any,{action,payload}: any){

    switch(action){
        case 'SET_FILTER':
        return {...state,filter:payload}
    }
    switch(action){
        case 'SET_ORDERBY':        
        return {...state,orderBy:payload}
    }
     switch(action){
        case 'SET_ORDER':        
        return {...state,order:payload}
    }
}

  return {state,dispatch};
}
