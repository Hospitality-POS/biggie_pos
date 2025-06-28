// import React, { useEffect, useState } from "react";

// function NubaLoader() {
//   const [cssLoaded, setCssLoaded] = useState(false);
//   const storedTenant = localStorage.getItem("tenant");
//   const tenant = storedTenant ? JSON.parse(storedTenant) : null;
//   const isRposTenant = tenant?.business_type?.name === "massage_parlour";

//   // For debugging
//   useEffect(() => {
//     console.log("Tenant business type:", tenant?.business_type?.name);
//     console.log("isRposTenant:", isRposTenant);
//   }, [tenant, isRposTenant]);

//   useEffect(() => {
//     // Reset the CSS loaded state when tenant changes
//     setCssLoaded(false);

//     if (isRposTenant) {
//       console.log("Loading NubaOriginal.css");
//       import("./NubaOriginal.css")
//         .then(() => {
//           console.log("NubaOriginal.css loaded successfully");
//           setCssLoaded(true);
//         })
//         .catch(error => {
//           console.error("Failed to load NubaOriginal.css:", error);
//           // Fallback to the default CSS if the specific one fails
//           import("./NubaLoader.css").then(() => setCssLoaded(true));
//         });
//     } else {
//       console.log("Loading NubaLoader.css");
//       import("./NubaLoader.css")
//         .then(() => {
//           console.log("NubaLoader.css loaded successfully");
//           setCssLoaded(true);
//         })
//         .catch(error => {
//           console.error("Failed to load NubaLoader.css:", error);
//         });
//     }
//   }, [isRposTenant]);

//   // Show a minimal loading indicator until CSS is loaded
//   if (!cssLoaded) {
//     return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>Loading...</div>;
//   }

//   if (isRposTenant) {
//     return (
//       <div className="loader">
//         <svg height="0" width="0" viewBox="0 0 100 100" className="absolute">
//           <defs xmlns="http://www.w3.org/2000/svg">
//             <linearGradient
//               gradientUnits="userSpaceOnUse"
//               y2="2"
//               x2="0"
//               y1="62"
//               x1="0"
//               id="b"
//             >
//               <stop stopColor="#000"></stop>
//               <stop stopColor="#914F1E" offset="1.5"></stop>
//             </linearGradient>
//             <linearGradient
//               gradientUnits="userSpaceOnUse"
//               y2="0"
//               x2="0"
//               y1="64"
//               x1="0"
//               id="c"
//             >
//               <stop stopColor="#000"></stop>
//               <stop stopColor="#914F1E" offset="1"></stop>
//               <animateTransform
//                 repeatCount="indefinite"
//                 keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1"
//                 keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
//                 dur="8s"
//                 values="0 32 32;270 32 32;270 32 32;540 32 32;540 32 32;810 32 32;810 32 32;1080 32 32;1080 32 32"
//                 type="rotate"
//                 attributeName="gradientTransform"
//               ></animateTransform>
//             </linearGradient>
//             <linearGradient
//               gradientUnits="userSpaceOnUse"
//               y2="2"
//               x2="0"
//               y1="62"
//               x1="0"
//               id="d"
//             >
//               <stop stopColor="#914F1E"></stop>
//               <stop stopColor="#000" offset="1.5"></stop>
//             </linearGradient>
//           </defs>
//         </svg>
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           fill="none"
//           viewBox="0 0 100 100"
//           width="100"
//           height="100"
//           className="inline-block"
//         >
//           <path
//             strokeLinejoin="round"
//             strokeLinecap="round"
//             strokeWidth="8"
//             stroke="url(#b)"
//             d="M 20,80 L 20,20 L 80,80 L 80,20"
//             className="dash"
//             pathLength="360"
//           ></path>
//         </svg>
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           fill="none"
//           style={{
//             "--rotation-duration": "0ms",
//             "--rotation-direction": "normal",
//           }}
//           viewBox="0 0 100 100"
//           width="100"
//           height="100"
//           className="inline-block"
//         >
//           <path
//             strokeLinejoin="round"
//             strokeLinecap="round"
//             strokeWidth="12"
//             stroke="url(#d)"
//             d="M 20,20 L 20,60 A 20,20 0 0 0 60,60 L 60,20"
//             className="dash"
//             pathLength="360"
//           ></path>
//         </svg>
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           fill="none"
//           viewBox="0 0 100 100"
//           width="100"
//           height="100"
//           className="inline-block"
//         >
//           <path
//             strokeLinejoin="round"
//             strokeLinecap="round"
//             strokeWidth="11"
//             stroke="url(#c)"
//             d="M 20,20 L 20,80 L 60,80 A 20,20 0 0 0 60,50 L 20,50 L 60,50 A 20,20 0 0 0 60,20 L 20,20"
//             className="spin"
//             pathLength="90"
//           ></path>
//         </svg>
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           fill="none"
//           style={{
//             "--rotation-duration": "0ms",
//             "--rotation-direction": "normal",
//           }}
//           viewBox="0 0 100 100"
//           width="100"
//           height="100"
//           className="inline-block"
//         >
//           <path
//             strokeLinejoin="round"
//             strokeLinecap="round"
//             strokeWidth="12"
//             stroke="url(#d)"
//             d="M 20,80 L 50,20 L 80,80 M 35,60 L 65,60"
//             className="dash"
//             pathLength="360"
//           ></path>
//         </svg>
//       </div>
//     );
//   }

//   return (
//     <div className="loader">
//       <div className="cell d-0"></div>
//       <div className="cell d-1"></div>
//       <div className="cell d-2"></div>
//       <div className="cell d-1"></div>
//       <div className="cell d-2"></div>
//       <div className="cell d-2"></div>
//       <div className="cell d-3"></div>
//       <div className="cell d-3"></div>
//       <div className="cell d-4"></div>
//     </div>
//   );
// }

// export default NubaLoader;
import classes from "./spinner.module.css";

function Spinner() {
  return (
    <>
      <div className={classes.container}>
        <div className={classes.loader}></div>
      </div>
    </>
  );
}

export default Spinner;
