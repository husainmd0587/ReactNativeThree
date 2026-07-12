// redux/workshopSlice.js  (or wherever your slice is)
import { createSlice } from '@reduxjs/toolkit';
import { weldingWorkshopData } from  '../../../mechanical_engineering/workshop/data/allWorkshopData'

const workshopSlice = createSlice({
  name: 'workshop',
  initialState: {
    currentWorkshop: weldingWorkshopData,
  },
  reducers: {
    setWorkshop: (state, action) => {
      state.currentWorkshop = action.payload;
    },
  },
});

export const { setWorkshop } = workshopSlice.actions;
export default workshopSlice.reducer;