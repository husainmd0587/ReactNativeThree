export const degToRad = (deg=[0,0,0]) => [(deg[0] * Math.PI) / 180,(deg[1] * Math.PI) / 180,(deg[2] * Math.PI) / 180]

export const radToDeg = (rad=[0,0,0]) => [(rad[0] * 180) / Math.PI,(rad[1] * 180) / Math.PI,(rad[2] * 180) / Math.PI]

export const roundTo = (num, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

export const formatNumber = (num, decimals = 2) => {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return roundTo(num, decimals).toString();
};

export const formatNumberWithUnits = (num, decimals = 2) => {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 1e6) return `${roundTo(num / 1e6, decimals)}M`;
  if (absNum >= 1e3) return `${roundTo(num / 1e3, decimals)}K`;
  return roundTo(num, decimals).toString();
};

export const formatAngle = (rad, decimals = 2) => {
  if (typeof rad !== 'number' || isNaN(rad)) return '0°';
  const deg = (rad * 180) / Math.PI;
  return `${roundTo(deg, decimals)}°`;
};

export const formatLength = (length, decimals = 2) => {
  if (typeof length !== 'number' || isNaN(length)) return '0 mm';
  return `${roundTo(length, decimals)} mm`;
};

export const formatArea = (area, decimals = 2) => {
  if (typeof area !== 'number' || isNaN(area)) return '0 mm²';
  return `${roundTo(area, decimals)} mm²`;
};

export const formatVolume = (volume, decimals = 2) => {
  if (typeof volume !== 'number' || isNaN(volume)) return '0 mm³';
  return `${roundTo(volume, decimals)} mm³`;
};

export const formatDimension = (value, unit = 'mm', decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) return `0 ${unit}`;
  return `${roundTo(value, decimals)} ${unit}`;
};