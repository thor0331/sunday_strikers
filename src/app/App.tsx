import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers';
import { router } from './router';
import { AvatarViewer } from '../components/common/AvatarViewer';
import { ScoreAnimation } from '../components/common/ScoreAnimation';
import { ToastContainer } from '../components/common/Toast';
import { RealtimeProvider } from '../components/providers/RealtimeProvider';

export function App() {
  return (
    <AppProviders>
      <RealtimeProvider>
        <RouterProvider router={router} />
        <AvatarViewer />
        <ScoreAnimation />
        <ToastContainer />
      </RealtimeProvider>
    </AppProviders>
  );
}
