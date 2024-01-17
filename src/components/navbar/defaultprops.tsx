import {
  ChromeFilled,
  CrownFilled,
  SmileFilled,
  StopFilled,
  TabletFilled,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import Table from '@pages/Tables/Table';

export default {
  route: {
    path: '/',
    routes: [
      {
        path: '/tables',
        name: 'welcome',
        icon: <SmileFilled />,
        access:false
      },
      {
        path: '/admin',
        name: 'Admin',
        icon: <CrownFilled />,
        access: 'canAdmin',
        component: "./",
        routes: [
          {
            path: '/admin/sub-page1',
            name: 'Store',
            icon: 'https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg',
            component: './Welcome',
          },
          {
            path: '/admin/sub-page2',
            name: '二级页面',
            icon: <CrownFilled />,
            component: './Welcome',
          },
          {
            path: '/admin/sub-page3',
            name: '三级页面',
            icon: <CrownFilled />,
            component: './Welcome',
          },
        ],
      },
      {
        name: 'store',
        icon: <TabletFilled />,
        path: '/list',
        component: './ListTableList',
        routes: [
          {
            path: '/list/sub-page',
            name: '列表页面',
            icon: <CrownFilled />,
            routes: [
              {
                path: 'sub-sub-page1',
                name: '一一级列表页面',
                icon: <CrownFilled />,
                component: './Welcome',
              },
              {
                path: 'sub-sub-page2',
                name: '一二级列表页面',
                icon: <CrownFilled />,
                component: './Welcome',
              },
              {
                path: 'sub-sub-page3',
                name: '一三级列表页面',
                icon: <CrownFilled />,
                component: './Welcome',
              },
            ],
          },
          {
            path: '/list/sub-page2',
            name: 'orders',
            icon: <CrownFilled />,
            component: './Welcome',
          },
          {
            path: '/list/sub-page3',
            name: '三级列表页面',
            icon: <CrownFilled />,
            component: './Welcome',
          },
        ],
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
      icon: <UsergroupAddOutlined />,
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/users',
    },
    {
      icon: <StopFilled/>,
      title: 'Category',
      desc: 'Add, view or update users',
      url: '/category',
    },
    {
      icon: <UsergroupAddOutlined />,
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/table-settings',
    },
    {
      icon: <UsergroupAddOutlined />,
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/',
    },

    {
      icon: <UsergroupAddOutlined />,
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/',
    },
    {
     icon: <UsergroupAddOutlined />,
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/',
    },
    {
      icon: <UsergroupAddOutlined />,
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/',
    },
    {
     icon: <UsergroupAddOutlined />,
      title: 'Users/People',
      desc: 'Add, view or update users',
      url: '/',
    },
  ],
};