import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminMatchDetailsPage } from '../pages/admin/AdminMatchDetailsPage';
import { LiveScoringPage } from '../pages/admin/LiveScoringPage';
import { MatchCreationPage } from '../pages/admin/MatchCreationPage';
import { PlayerManagementPage } from '../pages/admin/PlayerManagementPage';
import { SeasonManagementPage } from '../pages/admin/SeasonManagementPage';
import { TossPage } from '../pages/admin/TossPage';
import { TeamFormationPage } from '../pages/admin/TeamFormationPage';
import { AvailabilityPage } from '../pages/public/AvailabilityPage';
import { DashboardPage } from '../pages/public/DashboardPage';
import { LeaderboardsPage } from '../pages/public/LeaderboardsPage';
import { MatchHistoryPage } from '../pages/public/MatchHistoryPage';
import { MatchSummaryPage } from '../pages/public/MatchSummaryPage';
import { PlayersPage } from '../pages/public/PlayersPage';
import { SeasonsPage } from '../pages/public/SeasonsPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/players', element: <PlayersPage /> },
      { path: '/availability', element: <AvailabilityPage /> },
      { path: '/matches', element: <MatchHistoryPage /> },
      { path: '/matches/:matchId', element: <MatchSummaryPage /> },
      { path: '/leaderboards', element: <LeaderboardsPage /> },
      { path: '/seasons', element: <SeasonsPage /> }
    ]
  },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'players', element: <PlayerManagementPage /> },
          { path: 'seasons', element: <SeasonManagementPage /> },
          { path: 'matches/new', element: <MatchCreationPage /> },
          { path: 'matches/:matchId/edit', element: <MatchCreationPage /> },
          { path: 'matches/:matchId/teams', element: <TeamFormationPage /> },
          { path: 'matches/:matchId/toss', element: <TossPage /> },
          { path: 'matches/:matchId/scoring', element: <LiveScoringPage /> },
          { path: 'matches/:matchId/details', element: <AdminMatchDetailsPage /> }
        ]
      }
    ]
  }
]);
