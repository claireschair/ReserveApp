import { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from "../../lib/firebase";
import { useMatch } from "../../hooks/useMatch";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import ThemedLogo from "../../components/ThemedLogo";
import { Linking, TouchableOpacity } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

const { width, height } = Dimensions.get('window');

const Home = () => {
  const { getSupplyStats } = useMatch();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    const completedQuery = query(
      collection(db, "requests"),
      where("status", "==", "completed"),
      where("type", "==", "donate")
    );

    const unsubscribe = onSnapshot(
      completedQuery,
      (snapshot) => {
        loadStats();
      },
      (error) => {
        console.error("Error listening to completed donations:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const loadStats = async () => {
    try {
      const data = await getSupplyStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBackground} />
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
              <ThemedText style={styles.statText}>
                {loading ? '...' : formatNumber(stats?.totalItemsDistributed || 0)}
              </ThemedText>
              <ThemedText style={styles.descriptionText}>school supplies distributed</ThemedText>
            </View>
            <View style={styles.square}>
              <ThemedText style={styles.statText}>68.8</ThemedText>
              <ThemedText style={styles.descriptionText}>million teachers shortage</ThemedText>
            </View>
          </View>

          <View style={styles.mascotSection}>
            <Image 
              source={require('../../assets/icons/mascot.png')} 
              style={styles.mascotLarge}
            />

            <View style={styles.speechWrapper}>
              <View style={styles.speechBubble}>
                <ThemedText style={styles.mascotTitle}>
                  Make an Impact
                </ThemedText>
                <ThemedText style={styles.mascotText}>
                  Even one notebook can change a student’s day. Start small, and make a difference that lasts.
                </ThemedText>
              </View>
          
              <View style={styles.speechTailBorder} />
              <View style={styles.speechTail} />
            </View>
          </View>


          <Spacer height={10} />

          <View style={styles.globalStatsCard}>
            <ThemedText style={styles.subheading}>
              Global Education <Entypo name="globe" size={20} color="#4A90E2" />
            </ThemedText>

            <Spacer height={5} />

            <View style={styles.globalStatItem}>
              <ThemedText style={styles.globalIcon}><MaterialCommunityIcons name="bookshelf" size={24} color="#4A90E2" /></ThemedText>
              <View style={styles.globalTextWrap}>
                <ThemedText style={styles.globalStatTitle}>
                  244 Million Children
                </ThemedText>
                <ThemedText style={styles.globalStatDesc}>
                  Around the world are out of school, limiting future opportunities and economic mobility.
                </ThemedText>
              </View>
            </View>
          
            <View style={styles.globalStatItem}>
              <ThemedText style={styles.globalIcon}><FontAwesome name="pencil" size={24} color="#4A90E2" /></ThemedText>
              <View style={styles.globalTextWrap}>
                <ThemedText style={styles.globalStatTitle}>
                  Learning Poverty
                </ThemedText>
                <ThemedText style={styles.globalStatDesc}>
                  7 out of 10 children in low-income countries cannot read a simple story by age 10.
                </ThemedText>
              </View>
            </View>
          
            <View style={styles.globalStatItem}>
              <ThemedText style={styles.globalIcon}><FontAwesome6 name="school" size={17} color="#4A90E2"/></ThemedText>
              <View style={styles.globalTextWrap}>
                <ThemedText style={styles.globalStatTitle}>
                  Classroom Gaps
                </ThemedText>
                <ThemedText style={styles.globalStatDesc}>
                  Many schools lack basic materials like books, desks, and writing tools needed for daily learning.
                </ThemedText>
              </View>
            </View>
          
            <View style={styles.globalStatItem}>
              <ThemedText style={styles.globalIcon}><FontAwesome5 name="chalkboard-teacher" size={17} color="#4A90E2" /></ThemedText>
              <View style={styles.globalTextWrap}>
                <ThemedText style={styles.globalStatTitle}>
                  Teacher Shortage
                </ThemedText>
                <ThemedText style={styles.globalStatDesc}>
                  The world needs nearly 69 million more teachers to achieve universal education by 2030.
                </ThemedText>
              </View>
            </View>
            <Spacer height={5} />
            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={() => Linking.openURL('https://ourworldindata.org/global-education')}
            >
              <ThemedText style={styles.learnMoreText}>
                Learn More →
              </ThemedText>
            </TouchableOpacity>
          </View>


          <View style={styles.howItWorksCard}>
            <ThemedText style={styles.subheading}>
              How Reserve Works
            </ThemedText>
            <Spacer height={10} />
            <View style={styles.stepItem}>
              <Image source={require('../../assets/icons/donate.png')} style={styles.stepIcon}/>
              <View style={styles.stepTextContainer}>
                <ThemedText style={styles.stepTitle}>Give</ThemedText>
                <ThemedText style={styles.stepDescription}>
                  Donate used or new supplies to verified drop off locations.
                </ThemedText>
              </View>
            </View>
            <View style={styles.stepItem}>
              <Image source={require('../../assets/icons/connect.png')} style={styles.stepIcon}/>
              <View style={styles.stepTextContainer}>
                <ThemedText style={styles.stepTitle}>Connect</ThemedText>
                <ThemedText style={styles.stepDescription}>
                  Browse wishlists, start a donation drive, or discover local classrooms in need.
                </ThemedText>
              </View>
            </View>
            <View style={styles.stepItem}>
              <Image source={require('../../assets/icons/receive.png')} style={styles.stepIcon}/>
              <View style={styles.stepTextContainer}>
                <ThemedText style={styles.stepTitle}>Receive</ThemedText>
                <ThemedText style={styles.stepDescription}>
                  Request supplies or get connected with nearby resources.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <Spacer height={25} />
        <ThemedText style={styles.subheading}>
              Personal Statements
            </ThemedText>
        <View style={styles.storyCard}>
          {/* Why this card have a different color omg - faye*/}
          <ThemedText style={styles.storyText}>
            “Reserve is one step forward in increasing access to school supplies.”
          </ThemedText>
          <ThemedText style={styles.storyAuthor}>
            — Local Teacher
          </ThemedText>
        </View>
        <View style={styles.storyCard}>
          <ThemedText style={styles.storyText}>
            “Reserve is a way to build confidence in your students by putting their own supplies in their hands.”
          </ThemedText>
          <ThemedText style={styles.storyAuthor}>
            — Local Teacher
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>About • Contact • Privacy</ThemedText>
          <ThemedText style={styles.footerSub}>© 2026 Reserve</ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: "20%",
    backgroundColor: "#4A90E2",
    zIndex: 0,
  },
  circleBackground: {
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
    backgroundColor: 'rgb(255, 255, 255)',
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
  storyCard:{
    width: '85%',
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 20,
    padding: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  storyText:{
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  storyAuthor:{
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
    color: 'gray',
  },
  footer: {
    marginTop: 50,
    paddingBottom: 30,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 13,
    color: 'gray',
  },

  footerSub: {
   fontSize: 11,
   color: 'lightgray',
    marginTop: 5,
  },
  mascotSection: {
  width: '90%',
  alignSelf: 'center',
  flexDirection: 'row',
  alignItems: 'flex-end',
  marginTop: 15,
  zIndex: 3,
},
mascotLarge: {
  width: 220,  
  height: 220,
  marginLeft: -25,
  resizeMode: 'contain',
  top: 10,
},
speechWrapper: {
  flex: 1,
  marginLeft: 10,
  position: 'relative',
},

speechBubble: {
  backgroundColor: '#ffffff',
  borderRadius: 20,
  padding: 15,
  left: -10,

  borderWidth: 2,
  borderColor: '#4A90E2',

  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 4,
  marginBottom: 10,
},
speechTail: {
  position: 'absolute',
  left: -20,
  bottom: 46,

  width: 0,
  height: 0,
  borderTopWidth: 11,
  borderBottomWidth: 11,
  borderRightWidth: 14,
  borderTopColor: 'transparent',
  borderBottomColor: 'transparent',
  borderRightColor: '#ffffff',
},

speechTailBorder: {
  position: 'absolute',
  left: -23,    
  bottom: 45,

  width: 0,
  height: 0,

  borderTopWidth: 12,
  borderBottomWidth: 12,
  borderRightWidth: 14,

  borderTopColor: 'transparent',
  borderBottomColor: 'transparent',
  borderRightColor: '#4A90E2',
},

mascotTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#4A90E2',
  marginBottom: 5,
},

mascotText: {
  fontSize: 13,
  lineHeight: 18,
  color: '#333',
},
globalStatsCard: {
  width: '90%',
  alignSelf: 'center',
  backgroundColor: '#ffffff',
  borderRadius: 28,
  paddingVertical: 20,
  paddingHorizontal: 18,
  marginTop: 30,

  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
},
globalStatItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginTop: 18,
},
globalIcon: {
  fontSize: 22,
  marginRight: 12,
  marginLeft: 8,
  marginTop: 2,
},
globalTextWrap: {
  flex: 1,
},
globalStatTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#4f81ba',
},
globalStatDesc: {
  fontSize: 13,
  color: '#333',
  marginTop: 3,
  lineHeight: 18,
},
learnMoreButton: {
  marginTop: 10,
  alignSelf: 'center',
  backgroundColor: '#598dc4',
  paddingVertical: 10,
  paddingHorizontal: 22,
  borderRadius: 18,
  marginBottom: 10,

  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
},

learnMoreText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600',
},
});