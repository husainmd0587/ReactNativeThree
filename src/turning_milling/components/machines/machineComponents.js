export function ToolHolder({toolNumber = 1,tarretRed=0.22}) {
    const toolColors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'];
    //x y position  r=0.3 l=0.8
    const Angle=0
    const X = -tarretRed * Math.cos(Angle * Math.PI / 180);
    const Z = -tarretRed * Math.sin(Angle * Math.PI / 180);  
    return (
      <>
        <mesh position={[X,0.2,Z]} >
            <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
            <meshStandardMaterial color={toolColors[toolNumber - 1]} />
        </mesh>
      </>
    );
}

