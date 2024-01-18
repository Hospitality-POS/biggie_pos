import {
  ChromeFilled,
  CrownFilled,
  SmileFilled,
  TabletFilled,
} from '@ant-design/icons';

export default {
  route: {
    path: '/',
    routes: [
      {
        path: '/tables',
        name: 'Home',
        icon: <SmileFilled />,
      },
      {
        path: '/Store',
        name: 'store',
        icon: <CrownFilled />,
      },
      {
        name: 'orders',
        icon: <TabletFilled />,
        path: '/Orders',
      },
      {
        path: '/reports',
        name: 'Reports',
        icon: <ChromeFilled />,
      },
    ],
  },
  
  location: {
    pathname: '/',
  },



  appList: [
    {
      icon: '/people.png',
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/users',      
    },
    {
      icon: '/checklist.png',
      title: 'Category Settings',
      desc: 'Add, view or update Categories',
      url: '/Category-settings',
    },
    {
      icon: '/circle-table.png',
      title: 'Tables Settings',
      desc: 'Add, view or update tables',
      url: '/table-settings',
    },
    {
      icon: '/material-management.png',
      title: 'Inventory settings',
      desc: 'Add, view or update Product inventory',
      url: '/Inventory',
    },

    {
      icon: 'online-payment.png',
      title: 'payment methods',
      desc: 'Add, view or update payment methods',
      url: '/payment-settings',
    },
    {
     icon: '/supply-chain.png',
      title: 'suppliers',
      desc: 'Add, view or update suppliers',
      url: '/Supplier',
    },
    {
      icon: '/faq.png',
      title: 'FAQs',
      desc: 'Freuently asked questions?',
      url: '/fss-faqs',
    },
  
  ],
};