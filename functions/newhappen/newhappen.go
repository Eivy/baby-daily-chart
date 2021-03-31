package newhappen

import (
	"context"
	"log"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	store "cloud.google.com/go/firestore"
)

type Button struct {
	ID         string `firestore:"ID"`
	Name       string `firestore:"Name"`
	IsDuration bool   `firestore:"IsDuration"`
	UseMemo    bool   `firestore:"UseMemo"`
	For        string `firestore:"For"`
}

type Baby struct {
	ID   string `firestore:"ID"`
	Name string `firestore:"Name"`
}

const (
	HeaderBabyUserID    = "BABY_USER_ID"
	HeaderBabyButtonNum = "BABY_BUTTON_NUM"
	HeaderBabyName      = "BABY_NAME"
)

var client *store.Client
var projectID = "babydailychart"

func init() {
	var err error
	client, err = store.NewClient(context.Background(), projectID)
	if err != nil {
		log.Fatalln(err)
	}
}

func NewHappen(w http.ResponseWriter, r *http.Request) {
	log.Println(r)
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		log.Println("Method not allowed")
		return
	}
	id := r.Header.Get(HeaderBabyUserID)
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		log.Println("ID is not set")
		return
	}
	num := r.Header.Get(HeaderBabyButtonNum)
	if num == "" {
		w.WriteHeader(http.StatusBadRequest)
		log.Println("Physical Button Num is not set")
		return
	}
	err := createNewHappen(r.Context(), id, num)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Fatal(err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func createNewHappen(ctx context.Context, userID, num string) (err error) {
	physbtn, err := getPhysButton(ctx, userID, num)
	if err != nil {
		return
	}
	log.Printf("Got physical button: %v", physbtn)
	btn, err := getButton(ctx, userID, physbtn["b"+num])
	if err != nil {
		return
	}
	log.Printf("Got button: %v", btn)
	baby, err := getBaby(ctx, userID, physbtn["a"+num])
	if err != nil {
		return
	}
	log.Printf("Got baby: %v", baby)
	if btn.IsDuration {
		err = setNewHappenDuration(ctx, userID, baby.Name, btn)
	} else {
		err = setNewHappen(ctx, userID, baby.Name, btn)
	}
	return
}

func getPhysButton(ctx context.Context, userID, num string) (btn map[string]string, err error) {
	doc := client.Collection("Users").Doc(userID).Collection("config").Doc("PhysBtn")
	sn, err := doc.Get(ctx)
	if err != nil {
		log.Fatalf("Failed to get PhysBtn\n%v\n", err)
	}
	if err = sn.DataTo(&btn); err != nil {
		log.Fatal("No physical button settings")
		return
	}
	return
}

func getBaby(ctx context.Context, userID, babyID string) (baby Baby, err error) {
	doc := client.Collection("Users").Doc(userID).Collection("baby").Doc(babyID)
	sn, err := doc.Get(ctx)
	if err != nil {
		log.Fatalf("Failed to get baby: %s\n%v\n", babyID, err)
		return
	}
	if err = sn.DataTo(&baby); err != nil {
		return
	}
	return
}

func getButton(ctx context.Context, userID, btnID string) (btn Button, err error) {
	doc := client.Collection("Users").Doc(userID).Collection("button").Doc(btnID)
	sn, err := doc.Get(ctx)
	if err != nil {
		log.Fatalf("Failed to get button: %s\n%v\n", btnID, err)
		return
	}
	if err = sn.DataTo(&btn); err != nil {
		return
	}
	return
}

func setNewHappen(ctx context.Context, userID, baby string, btn Button) (err error) {
	_, _, err = client.Collection("Users").Doc(userID).Collection("timeline").Add(ctx, struct {
		Baby  string
		Label string
		Start time.Time
		End   time.Time
	}{
		baby,
		btn.Name,
		time.Now(),
		time.Now(),
	})
	return
}

func setNewHappenDuration(ctx context.Context, userID, baby string, btn Button) (err error) {
	col := client.Collection("Users").Doc(userID).Collection("timeline")
	q := col.Where("Baby", "==", baby).Where("Label", "==", btn.Name).Where("End", "==", "-")
	d := q.Documents(ctx)
	s, err := d.GetAll()
	if err != nil {
		log.Fatalf("Failed to get continue happen: %v", err)
		return
	}
	if len(s) == 0 {
		_, _, err = client.Collection("Users").Doc(userID).Collection("timeline").Add(ctx, struct {
			Baby  string
			Label string
			Start time.Time
			End   string
		}{
			baby,
			btn.Name,
			time.Now(),
			"-",
		})
		if err != nil {
			log.Fatalf("Failed to set newhappen\n%v\n", err)
		}
	} else {
		for _, s := range s {
			_, err = client.Collection("Users").Doc(userID).Collection("timeline").Doc(s.Ref.ID).Update(ctx, []firestore.Update{{Path: "End", Value: time.Now()}})
			if err != nil {
				log.Fatalf("Failed to update newhappen\n%v\n", err)
				return
			}
		}
	}
	return
}
