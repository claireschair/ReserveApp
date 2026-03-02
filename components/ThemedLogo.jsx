import { Image, useColorScheme } from 'react-native'

// images
import DarkLogo from '../assets/logo/logo_dark.png'
import LightLogo from '../assets/logo/logo_light.png'

const ThemedLogo = () => {
  const colorScheme = useColorScheme()
  
  const logo = colorScheme === 'dark' ? DarkLogo : LightLogo

  return (
    <Image 
      source={logo} 
      style={{width: 150, height: 150}} 
      resizeMode="contain"
    />
  )
}

export default ThemedLogo