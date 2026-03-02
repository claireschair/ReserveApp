import { View, Image, StyleSheet, Dimensions, ScrollView } from 'react-native'
import Spacer from "../../components/Spacer"
import ThemedText from "../../components/ThemedText"
import ThemedView from "../../components/ThemedView"
import ThemedLogo from "../../components/ThemedLogo"
const {width, height } = Dimensions.get('window')

const Home = () => {
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
      <View style ={styles.topBackground} />
      <View style={styles.circleBackground} />
      <View style={styles.header}>
        
        <Spacer />
        <ThemedLogo />
      
        <ThemedText title style={styles.heading}>
          Reserve
        </ThemedText>
        <Spacer height={20} />
      <ThemedText style={styles.subheading}>
        Our Mission
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Reserve aims to expand access to education by helping school supplies reach the students and teachers who need them most.
        We do this by re-serving gently used and donated materials, connecting communities to local resources, 
        and support classrooms through shared wishlists and direct giving. Our mission is simple: reduce waste, increase 
        opportunity, and make learning possible for everyone. 
      </ThemedText>


      <View style={styles.squareRow}>
        <View style={styles.square}>
          <ThemedText style={styles.statText}>70%</ThemedText>
          <ThemedText style={styles.descriptionText}>global learning poverty rate</ThemedText>
        </View>
        <View style={styles.square}>
          <ThemedText style={styles.statText}>0</ThemedText>
          <ThemedText style={styles.descriptionText}>school supplies distributed</ThemedText>
        </View>
        <View style={styles.square}>
          <ThemedText style={styles.statText}>68.8</ThemedText>
          <ThemedText style={styles.descriptionText}>million teachers shortage</ThemedText>
        </View>
      </View>

      <Spacer />

      <View style={styles.howItWorksCard}>
      <ThemedText style={styles.subheading}>
        How Reserve Works
      </ThemedText>
      <Spacer height={10} />
      <View style = {styles.stepItem}>
        <Image source={require('../../assets/icons/donate.png')} style={styles.stepIcon}/>
        <View style = {styles.stepTextContainer}>
          <ThemedText style = {styles.stepTitle}>Give</ThemedText>
          <ThemedText style={styles.stepDescription}>
            Donate used or new supplies to verified drop off locations.
          </ThemedText>
        </View>
      </View>
      <View style = {styles.stepItem}>
        <Image source={require('../../assets/icons/connect.png')} style={styles.stepIcon}/>
        <View style = {styles.stepTextContainer}>
          <ThemedText style = {styles.stepTitle}>Connect</ThemedText>
          <ThemedText style={styles.stepDescription}>
            Browse wishlists, start a donation drive, or discover local classrooms in need.
          </ThemedText>
        </View>
      </View>
      <View style = {styles.stepItem}>
        <Image source={require('../../assets/icons/receive.png')} style={styles.stepIcon}/>
        <View style = {styles.stepTextContainer}>
          <ThemedText style = {styles.stepTitle}>Receive</ThemedText>
          <ThemedText style={styles.stepDescription}>
            Request supplies or get connected with nearby resources.
          </ThemedText>
        </View>
      </View>
      </View>
      </View>


      <Spacer height={100} />

    </ScrollView>
    </ThemedView>
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: "30%", //top half is blue
    backgroundColor: "#4A90E2",
    zIndex: 0,
  },
  circleBackground: { //Circle 
    position: 'absolute',
    top: 160,
    left: -width*0.15,
    width: width*1.3,
    height: 475,
    backgroundColor: '#f8f9fa',
    borderRadius: 350,
    zIndex: 0, 
  },
  header: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 40,
    color: 'black',
    textAlign: 'center',
    marginTop: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subheading: {
    fontSize: 23,
    fontWeight: '700',
    color: '#4A90E2',
    marginTop: 10,
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 6,
    lineHeight: 22,
  },
  squareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', 
    marginTop: 40,
    width: '90%', 
    alignSelf: 'center', 
  },
  scrollView:{
    flex:1,
    backgroundColor: "#4A90E2",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },
  square: {
    width: 90,
    height: 90,
    backgroundColor: "#4A90E2",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  statText: {
    fontSize: 29,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 2,  
  },
  descriptionText: {
    fontSize: 8.5,
    color: "white",
    textAlign: "center",
    lineHeight: 10,
  },
  stepsContainer:{
    width: '85%',
    marginTop: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginTop: 20,
    marginBottom: 28,
    paddingHorizontal: 30,
  },
  stepIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  stepTextContainer:{
    flex:1,
    flexDirection: 'column',
    //marginLeft: 14,
    //paddingRight: 20,
  },
  stepTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: 'black',
    marginTop: 2,
    marginLeft: 14,
  },
  stepDescription: {
    fontSize: 14,
    color: 'black',
    textAlign: 'left',
    paddingHorizontal: 5,
    lineHeight: 16,
    marginTop: 5,
    marginLeft: 10,
  },
  howItWorksCard: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor:  'rgb(255, 255, 255)',
    borderRadius: 28,
    paddingVertical: 25,
    paddingHorizontal: 10,
    marginTop: 40,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
},

})
