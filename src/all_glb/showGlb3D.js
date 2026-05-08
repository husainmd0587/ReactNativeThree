import CanvaProvider from "../provider";
import {FirstObj, Worker,Table} from "./worker";
import { CastIronPart } from './dracoObj'
import {Online_CastIronPart} from "./online_glb";
import { Cubes125 } from "./meshoptGlb";

 const ShowGlb3D = () => {
    return (
        <CanvaProvider >
            {/* <FirstObj /> */}
            {/* <Cubes/> */}
            {/* <CastIronPart/> */}
                <Cubes125/>
            {/* <Online_CastIronPart/> */}
            {/* <Table/> */}
        </CanvaProvider>
    )
}

export default ShowGlb3D;