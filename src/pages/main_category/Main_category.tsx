import React from 'react';
import { Button, Container, Grid } from '@mui/material';
import { Link, Outlet, useParams } from 'react-router-dom';

const MainCategory: React.FC = () => {
  const { id } = useParams()
  return (
    <Container>
      <Grid container justifyContent="center" alignItems="center" style={{ height: '100vh' }}>
        <Grid item xs={12} textAlign="center">
          <Button component={Link} to={`/main-category/${id}/kitchen`} variant="contained" color="primary" style={{ margin: '8px' }}>
            Kitchen
          </Button>
          <Button component={Link} to={`/main-category/${id}/bar`} variant="contained" color="secondary" style={{ margin: '8px' }}>
           BAR
          </Button>
        </Grid>
      </Grid>
      <Outlet/>
    </Container>
  );
};

export default MainCategory;
