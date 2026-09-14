import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import posCartReducer from './slices/posCartSlice';

export const store = configureStore({
  reducer: {
    posCart: posCartReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Selectors
export const selectOrderTabs = (state: RootState) => state.posCart.orderTabs;
export const selectActiveTabId = (state: RootState) => state.posCart.activeTabId;
export const selectActiveTab = (state: RootState) =>
  state.posCart.orderTabs.find((t) => t.id === state.posCart.activeTabId) || state.posCart.orderTabs[0];
export const selectActiveCartItems = (state: RootState) => selectActiveTab(state)?.items || [];
export const selectActiveCartItemCount = (state: RootState) =>
  selectActiveCartItems(state).reduce((sum, i) => sum + i.quantity, 0);
