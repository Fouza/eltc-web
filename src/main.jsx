import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router';
import dayjs from 'dayjs';
import './styles/global.scss';
import { store } from '@store/index';
import { fetchMe, logout } from '@store/authSlice';
import { setUnauthorizedHandler } from '@api/client';
import { SocketProvider } from '@context/SocketContext';
import { ConfirmProvider } from '@context/ConfirmContext';
import { Toaster } from '@components';
import { initTheme } from '@helpers/theme';
import { routes } from './routes';

dayjs.locale('en');
initTheme();
setUnauthorizedHandler(() => store.dispatch(logout()));
if (store.getState().auth.token) store.dispatch(fetchMe());

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <SocketProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
          <Toaster />
        </ConfirmProvider>
      </SocketProvider>
    </Provider>
  </StrictMode>,
);
